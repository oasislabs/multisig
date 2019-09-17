#[macro_use]
extern crate serde;

use map_vec::{Map, Set};
use oasis_std::{Context, Address, AddressExt};

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

#[derive(Serialize, Deserialize)]
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
    pub fn new(_ctx: &Context, owners: Set<Address>, required: u32) -> Self {
        Self {
            transactions: Map::new(),
            owners: owners,
            required: required,
            transaction_count: 0,
        }
    }

    pub fn add_transaction(&mut self, ctx: &Context, destination: Address, value: u64, data: Vec<u8>) -> Result<u32, Error> {
        if !self.owners.contains(&ctx.sender()) {
            return Err(Error::MustBeOwner);
        }
        let transaction = Transaction {
            destination: destination,
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
    fn test() {
        let sender = oasis_test::create_account(1);
        let ctx = Context::default().with_sender(sender);
        let client = Multisig::new(&ctx);
    }
}
