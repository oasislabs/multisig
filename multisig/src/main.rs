#[macro_use]
extern crate serde;

use map_vec::{Map, Set};
use oasis_std::{Context, Address, AddressExt};
use std::iter::FromIterator;
use std::str::FromStr;

#[derive(Debug, Eq, PartialEq, Serialize, Deserialize, failure::Fail)]
pub enum Error {
    #[fail(display = "Only existing owners can perform this operation.")]
    MustBeOwner,

    #[fail(display = "Transaction does not exist.")]
    TransactionNotExists,

    #[fail(display = "Transaction not confirmed.")]
    TransactionNotConfirmed,

    #[fail(display = "Transaction already executed.")]
    TransactionRepeat,

    #[fail(display = "Transaction errored.")]
    TransactionError,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
struct Transaction {
    destination: Address,
    value: u64,
    data: Vec<u8>,
    executed: bool,
    confirmations: Set<Address>,
}

#[derive(oasis_std::Service)]
struct Multisig {
    transactions: Map<u32, Transaction>,
    owners: Set<Address>,
    required: u32,
    transaction_count: u32,
}

impl Multisig {
    pub fn new(_ctx: &Context, addresses: Vec<String>, required: u32) -> Self {
        Self {
            transactions: Map::new(),
            owners: Set::from_iter(addresses.iter().map(|a| Address::from_str(a).unwrap())),
            required: required,
            transaction_count: 0,
        }
    }

    pub fn add_transaction(&mut self, ctx: &Context, destination: String, value: u64, data: Vec<u8>) -> Result<u32, Error> {
        if !self.owners.contains(&ctx.sender()) {
            eprintln!("Error");
            return Err(Error::MustBeOwner);
        }
        let transaction = Transaction {
            destination: Address::from_str(&destination).unwrap(),
            value: value,
            data: data,
            executed: false,
            confirmations: Set::new(),
        };
        self.transactions.insert(self.transaction_count, transaction);
        self.transaction_count += 1;
        Ok(self.transaction_count - 1)
    }

    pub fn get_transaction(&self, ctx: &Context, transaction_id: u32) -> Result<&Transaction, Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        let transaction = self.transactions.get(&transaction_id);
        if !transaction.is_some() {
            return Err(Error::TransactionNotExists);
        }
        Ok(transaction.unwrap())
    }

    pub fn get_required(&self, ctx: &Context) -> Result<u32, Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        Ok(self.required)
    }

    pub fn confirm_transaction(&mut self, ctx: &Context, transaction_id: u32) -> Result<(), Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        let transaction = self.transactions.get_mut(&transaction_id);
        if !transaction.is_some() {
            return Err(Error::TransactionNotExists);
        }
        transaction.unwrap().confirmations.insert(ctx.sender());
        Ok(())
    }

    pub fn revoke_confirmation(&mut self, ctx: &Context, transaction_id: u32) -> Result<(), Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        let transaction = self.transactions.get_mut(&transaction_id);
        if !transaction.is_some() {
            return Err(Error::TransactionNotExists);
        }
        transaction.unwrap().confirmations.remove(&ctx.sender());
        Ok(())
    }

    pub fn is_confirmed(&self, ctx: &Context, transaction_id: u32) -> Result<bool, Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        let transaction = self.transactions.get(&transaction_id);
        if !transaction.is_some() {
            return Err(Error::TransactionNotExists);
        }
        Ok(transaction.unwrap().confirmations.len() >= self.required as usize)
    }

    pub fn execute_transaction(&mut self, ctx: &Context, transaction_id: u32) -> Result<Vec<u8>, Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        let transaction_check = self.transactions.get_mut(&transaction_id);
        if !transaction_check.is_some() {
            return Err(Error::TransactionNotExists);
        }
        let transaction = transaction_check.unwrap();
        if transaction.confirmations.len() < self.required as usize {
            return Err(Error::TransactionNotConfirmed);
        }
        if transaction.executed {
            return Err(Error::TransactionRepeat);
        }
        let context = Context::delegated().with_value(transaction.value as u128);
        match transaction.destination.call(&context, &transaction.data) {
            Ok(result) => {
                transaction.executed = true;
                Ok(result)
            },
            Err(_err) => Err(Error::TransactionError),
        }
    }
}

fn main() {
    oasis_std::service!(Multisig);
}

#[cfg(test)]
mod tests {
    extern crate oasis_test;

    use super::*;

    #[test]
    fn test_getters() {
        let sender = oasis_test::create_account(1);
        let unauthorized = oasis_test::create_account(1);
        let ctx = Context::default().with_sender(sender);
        let unauthorized_ctx = Context::default().with_sender(unauthorized);
        let mut addresses = Vec::new();
        addresses.push((&sender.to_string()[2..]).to_string());
        let mut client = Multisig::new(&ctx, addresses, 1);
        let destination = oasis_test::create_account(0);
        let dest_address = (&destination.to_string()[2..]).to_string();
        let value = 1;
        let tx_data = vec![1u8, 2, 3];
        let tx = Transaction {
            destination: destination.clone(),
            value: value,
            data: tx_data.clone(),
            executed: false,
            confirmations: Set::new(),
        };

        assert_eq!(client.get_required(&ctx).unwrap(), 1);
        assert_eq!(client.add_transaction(&ctx, dest_address.clone(), value, tx_data.clone()).unwrap(), 0);
        assert_eq!(client.get_transaction(&unauthorized_ctx, 0), Err(Error::MustBeOwner));
        assert_eq!(client.get_transaction(&ctx, 0).unwrap(), &tx);
    }

    #[test]
    fn test_confirmation() {
        let sender1 = oasis_test::create_account(1);
        let sender2 = oasis_test::create_account(1);
        let ctx1 = Context::default().with_sender(sender1);
        let ctx2 = Context::default().with_sender(sender2);
        let mut addresses = Vec::new();
        addresses.push((&sender1.to_string()[2..]).to_string());
        addresses.push((&sender2.to_string()[2..]).to_string());
        let mut client = Multisig::new(&ctx1, addresses, 2);
        let destination = oasis_test::create_account(0);
        let dest_address = (&destination.to_string()[2..]).to_string();
        let value = 1;
        let tx_data = vec![1u8, 2, 3];

        assert_eq!(client.add_transaction(&ctx1, dest_address.clone(), value, tx_data.clone()).unwrap(), 0);
        assert_eq!(client.is_confirmed(&ctx1, 0).unwrap(), false);
        assert_eq!(client.confirm_transaction(&ctx1, 0), Ok(()));
        assert_eq!(client.is_confirmed(&ctx1, 0).unwrap(), false);
        assert_eq!(client.confirm_transaction(&ctx2, 0), Ok(()));
        assert_eq!(client.is_confirmed(&ctx1, 0).unwrap(), true);
        assert_eq!(client.revoke_confirmation(&ctx2, 0), Ok(()));
        assert_eq!(client.is_confirmed(&ctx1, 0).unwrap(), false);
    }
}
