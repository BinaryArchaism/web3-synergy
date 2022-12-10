import {
  Action,
  Contract,
  ContractMapping, ContractState,
  ContractValue,
  IncomingTx,
  JsonVar,
  logger,
  Param,
  Params, State,
  Tx,
  Var,
} from '@wavesenterprise/contract-core'
import BN from 'bn.js'

interface UserData {
  amount:number;
  publicKey:string;
  address:string;
}

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
      // @Tx tx: IncomingTx,
      @Param("amountToMint") amountToMint: BN,
      @Param("amountToPledge") amountToPledge: BN,
  ) {
    if (amountToMint.eq(0)) {
      throw new Error('amountToMint equals zero!')
    }
    // const userDebt = await this.state.get("user_" + tx.sender.toString() + "_debt")
    // if (userDebt === undefined) {
    //   throw new Error('no user debt info!')
    // }
  }
}
