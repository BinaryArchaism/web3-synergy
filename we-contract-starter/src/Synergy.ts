import {
  Action,
  Contract,
  ContractMapping, ContractState,
  ContractValue,
  IncomingTx,
  JsonVar,
  logger,
  Param,
  Payments,
  Params, State,
  Tx,
  Var, TransferIn,
} from '@wavesenterprise/contract-core'
import BN from 'bn.js'

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
    if (amountToMint.eq(0)) {
      throw new Error('amountToMint equals zero')
    }
    const userDebt = await this.state.get("user_" + tx.sender.toString() + "_debt")
    if (userDebt === undefined) {
      throw new Error('no user debt info')
    }
  }

//   function mint(uint256 _amountToMint, uint256 _amountToPledge) external {
//   UserDebt storage debt = userDebts[msg.sender];
//
//   require(_amountToMint != 0, "Mint amount cannot be zero");
//
//   uint256 globalDebt_ = globalDebt();
//   uint256 shares_ = globalDebt_ == 0 ? 1e18 : (totalShares * _amountToMint) / globalDebt_;
//   totalShares += shares_;
//
//   debt.minted += _amountToMint;
//   debt.collateral += _amountToPledge;
//   debt.shares += shares_;
//
//   uint32 collateralRatio_ = collateralRatio(msg.sender);
//   require(collateralRatio_ >= minCollateralRatio, "Collateral ration less than minCollateralRatio");
//
//   wEth.transferFrom(msg.sender, address(this), _amountToPledge);
//   synter.mintSynt(address(rUsd), msg.sender, _amountToMint);
//
//   emit Minted(_amountToMint, _amountToPledge);
// }

  @Action
  async deposit(
      @Tx tx: IncomingTx,
      @Payments payment: TransferIn,
  ) {
      if (payment.amount.eq(0)) {
        throw new Error("amount is zero")
      }
      // проверка на ист или вест
      if (!payment.assetId) {

      }
      const eastAddress = await this.state.get("east_address")
      if (eastAddress != payment.assetId) {
        throw new Error("invalid east address")
      }

      let userDebt = await this.state.get("user_" + tx.sender.toString() + "_debt")
      if (userDebt === undefined) {
        userDebt = 0;
      }
      this.state.set("user_" + tx.sender.toString() + "_debt", payment.amount + userDebt)

  }

//   /**
//    * @notice Deposit wETH to collateral to increase collateral rate and escape liquidation
//    * @param _amount amoount of wETH to deposit
//    */
//   function deposit(uint256 _amount) external {
//   UserDebt storage debt = userDebts[msg.sender];
//
//   debt.collateral += _amount;
//   wEth.transferFrom(msg.sender, address(this), _amount);
//
//   emit Deposited(_amount);
// }
}
