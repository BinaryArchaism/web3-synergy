import {
  Action, Contract, ContractState, IncomingTx, Param, Payments, State, Tx, TransferIn,
} from '@wavesenterprise/contract-core'
import BN from 'bn.js'
import {UserDebtDefault} from "./Models";
import {GlobalDebtKey, Placeholder, UserDebtKey} from "./Constants";

//TODO
// для west 200% и ликвидация с 150%
// для east 150% и ликвидация с 120%

@Contract()
export default class Synergy {
  @State() state: ContractState;
  //
  // @Action({ onInit: true })
  // init(@Params() params: Record<string, unknown>) {
  //
  // }

  @Action()
  async mint(
      @Tx tx: IncomingTx,
      @Param("amountToMint") amountToMint: BN, // Amount of rUSD to mint
      @Param("amountToPledge") amountToPledge: BN, // Amount of wETH to pledge
  ) {
      // check if amountToMint is zero
      if (amountToMint.eq(0)) {
          throw new Error('amountToMint equals zero')
      }
      // get user previous deposits
      const userDebt = await this.state.get(this.getUserDebtKey(tx))
      if (userDebt === undefined) {
          throw new Error('no user debt info')
      }
      const globalDebt = await this.getGlobalDebt()

  }

  @Action
  async deposit(
      @Tx tx: IncomingTx,
      @Payments payment: TransferIn,
  ) {
      // payment non zero
      if (payment.amount.eq(0)) {
        throw new Error("amount is zero")
      }
      // check west or east passed
      const eastAddress = await this.state.get("east_address")
      if ((eastAddress !== payment.assetId) || (!payment.assetId)) {
        throw new Error("invalid east or west address")
      }
      // get user previous deposits
      let userDebt = UserDebtDefault;
      let userDebtJson = await this.state.get(this.getUserDebtKey(tx))
      if (userDebtJson !== undefined) {
          userDebt = JSON.parse(<string>userDebtJson);
      }
      // set new user deposit
      userDebt.Collateral += payment.amount;

      // set to blockchain
      userDebtJson = JSON.stringify(userDebt)
      // this.state.set("user_" + tx.sender.toString() + "_debt", userDebtJson)
      this.state.set(this.getUserDebtKey(tx), userDebtJson)
  }

  async getGlobalDebt():BN {
      // try to get global debt from blockchain
      let globalDebt = await this.state.get(GlobalDebtKey)
      if (globalDebt === undefined) {
          globalDebt = 0;
      }
      return BN(globalDebt)
  }

  // getUserDebtKey returns string "user_{sender address}_debt"
  getUserDebtKey(tx:IncomingTx):string {
      return UserDebtKey.replace(Placeholder, tx.sender.toString())
  }
}
