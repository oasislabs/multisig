#[macro_use]
extern crate serde;

use oasis_std::{Context, Address};

#[derive(Debug, Eq, PartialEq, Serialize, Deserialize, failure::Fail)]
pub enum Error {
    #[fail(display = "Only deployed multisig service can make this call.")]
    NotAllowed,
}

#[derive(oasis_std::Service)]
struct MultisigCounter {
    count: u32,
    allowed: Address,
}

impl MultisigCounter {
    pub fn new(_ctx: &Context, allowed: Address) -> Self {
        Self {
            count: 0,
            allowed,
        }
    }

    pub fn increment(&mut self, ctx: &Context) -> Result<(), Error> {
        if self.allowed != ctx.sender() {
            return Err(Error::NotAllowed);
        }
        self.count = self.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn get_count(&self, _ctx: &Context) -> u32 {
        self.count
    }
}

fn main() {
    oasis_std::service!(MultisigCounter);
}

#[cfg(test)]
mod tests {
    extern crate oasis_test;

    use super::*;

    #[test]
    fn test() {
        let sender = oasis_test::create_account(1);
        let unauthorized = oasis_test::create_account(1);
        let ctx = Context::default().with_sender(sender);
        let unauthorized_ctx = Context::default().with_sender(unauthorized);
        let mut client = MultisigCounter::new(&ctx, sender);

        assert_eq!(client.increment(&ctx), Ok(()));
        assert_eq!(client.increment(&unauthorized_ctx), Err(Error::NotAllowed));
        assert_eq!(client.get_count(&ctx), 1);
    }
}
