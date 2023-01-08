import {
    Action, Contract, ContractState, IncomingTx, Param, Payments, State, Tx, TransferIn, Asset,
} from '@wavesenterprise/contract-core'
import BN from 'bn.js'
import {SynthInfo, UserDebt, UserDebtDefault} from "./Models";
import {
    GlobalDebtKey,
    LiquidationCollateralRatioKey, LiquidationPenaltyKey, MaxCollateralRatio,
    MinCollateralRatioKey, OwnerAddressKey,
    Placeholder, RusdAddressKey, SwapFeeKey, SynthInfoKey, TotalSharesKey, TreasuryFeeKey,
    UserDebtKey
} from "./Constants";
import {getPrice, getRusdPrice, getWestPrice} from "./Oracle";

//TODO
// для west 200% и ликвидация с 150%
// для east 150% и ликвидация с 120%

@Contract()
export default class Synergy {
  @State() state: ContractState;

  @Action({ onInit: true })
  init(
      @Param(MinCollateralRatioKey) minCollateralRatio:number,
      @Param(LiquidationCollateralRatioKey) liquidationCollateralRatio:number,
      @Param(LiquidationPenaltyKey) liquidationPenalty:number,
      @Param(TreasuryFeeKey) treasuryFee:number,
      @Param(OwnerAddressKey) ownerAddress:string,
  ) {
      if (liquidationCollateralRatio <= minCollateralRatio) {
          throw new Error("liquidationCollateralRatio should be <= minCollateralRatio")
      }
      if (1e8 + liquidationPenalty + treasuryFee <= liquidationCollateralRatio) {
          throw new Error("1 + liquidationPenalty + treasuryFee should be <= liquidationCollateralRatio")
      }
      this.state.set(MinCollateralRatioKey, minCollateralRatio);
      this.state.set(LiquidationCollateralRatioKey, liquidationCollateralRatio);
      this.state.set(LiquidationPenaltyKey, liquidationPenalty);
      this.state.set(TreasuryFeeKey, treasuryFee);
      this.state.set(OwnerAddressKey, ownerAddress);
  }

  @Action()
  async setData(
      @Tx tx: IncomingTx,
      // TODO method changes some data
  ) {
      await this.onlyOwner(tx)
  }
  @Action()
  async issueRusd(
      @Tx tx: IncomingTx,
  ) {
      await this.onlyOwner(tx)
      const rusd = await Asset.new();
      await rusd.issue("RUSD", "RawUSD", 0, 1e8, true);
      this.state.set(RusdAddressKey, rusd.getId());
  }

  @Action()
  async mint(
      @Tx tx: IncomingTx,
      @Param("amountToMint") amountToMint: BN, // Amount of rUSD to mint
      @Param("amountToPledge") amountToPledge: BN, // Amount of wETH to pledge
  ) {
      // check if amountToMint is zero
      if (amountToMint.eq(0)) {
          throw new Error('amountToMint equals zero');
      }
      // get user previous deposits
      let userDebt = await this.getUserDebtFromJsonWithError(tx)

      // get shares
      const globalDebt = await this.getGlobalDebt();
      const totalShares = await this.getTotalShares();
      let shares = globalDebt == 0 ? 1e18 : (totalShares * amountToMint) / globalDebt;

      userDebt.Minted += amountToMint;
      userDebt.Collateral += amountToPledge;
      userDebt.Shares += shares;

      let collateralRatio = await this.getCollateralRatio(tx);
      const minCollateralRatio = await this.getMinCollateralRatio();
      if (collateralRatio >= minCollateralRatio) {
          throw new Error('collateral ration less than minCollateralRatio');
      }

      // mint rusd and send to user
      const rusdId = await this.state.get(RusdAddressKey)
      const rusd = await Asset.new(+rusdId);
      await rusd.reissue(<number>amountToMint, true);
      await rusd.transfer(tx.sender.toString(), amountToMint);
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
     let userDebt = await this.getUserDebtFromJson(tx)
      // set new user deposit
      userDebt.Collateral += payment.amount;

      // set to blockchain
      this.setUserDebt(tx, userDebt)
  }

  @Action
  async burn(
      @Tx tx: IncomingTx,
      @Payments payment: TransferIn,
  ) {
      if (payment.amount == 0) {
          throw new Error('amount is zero');
      }
      const rusdId = await this.state.get(RusdAddressKey)
      const rusd = await Asset.new(+rusdId);

      if (payment.assetId != rusd.getId()) {
          throw new Error('invalid token');
      }

      let debt = await this.getUserDebtFromJsonWithError(tx);
      const globalDebt = await this.getGlobalDebt();
      let totalShares = await this.getTotalShares();
      let userDebt = (globalDebt * debt.Shares) / totalShares;
      let amountToBurn = userDebt >= payment.amount ? payment.amount : userDebt;
      let sharesToBurn = (payment.amount * totalShares) / globalDebt;

      // get rid of round
      if (userDebt == payment.amount) {
          totalShares -= debt.Shares;
          debt.Shares = 0;
      } else {
          debt.Shares -= sharesToBurn;
          totalShares -= sharesToBurn;
      }

      if (debt.Minted > amountToBurn) {
              debt.Minted -= amountToBurn;
      } else {
          debt.Minted = 0;
      }

      await this.setUserDebt(tx, debt);
      await this.state.set(TotalSharesKey, totalShares);
      await rusd.burn(payment.amount);
  }

  @Action
  async withdraw(
      @Tx tx: IncomingTx,
      @Param("amount") amount: BN, // Amount of rUSD to withdraw
  ) {
      if (amount == 0) {
          throw new Error('amount is zero');
      }
      let debt = await this.getUserDebtFromJsonWithError(tx);

      let amountToWithdraw = debt.Collateral > amount ? amount : debt.Collateral;
      debt.Collateral -= amountToWithdraw;

      let collateralRatio = await this.getCollateralRatio(tx);
      const minCollateralRatio = await this.getMinCollateralRatio();
      if (collateralRatio >= minCollateralRatio || collateralRatio == 0) {
          throw new Error('Result ratio less than minCollateralRatio');
      }

      // only west
      const west = await Asset.new(null);
      await west.transfer(tx.sender, amount);
  }

  @Action
  async liquidate(
      @Tx tx: IncomingTx,
      @Param("userAddress") userAddress: string,
  ) {
      let debt = await this.getUserDebtFromJsonWithError(tx);
      let globalDebt = await this.getGlobalDebt();
      let totalShares = await this.getTotalShares();
      let userDebt = (globalDebt * debt.Shares) / totalShares;
      const liquidationCollateralRatio = await this.state.get(LiquidationCollateralRatioKey);
      let collateralRatio = await this.getCollateralRatio(undefined, userAddress);
      if (collateralRatio < +liquidationCollateralRatio) {
          throw new Error('Cannot liquidate yet');
      }
      const minCollateralRatio = await this.getMinCollateralRatio()
      const liquidationPenalty = await this.state.get(LiquidationPenaltyKey)
      const treasuryFee = await this.state.get(TreasuryFeeKey)


      let [rUsdPrice, rUsdDecimals] = getRusdPrice();
      let [westPrice, westDecimals] = getWestPrice();

      let neededRusd = (
          minCollateralRatio * userDebt * rUsdPrice * 10 ** westDecimals
          - debt.Collateral * westPrice * 10 ** (8 + rUsdDecimals)
      ) / (rUsdPrice * 10 ** westDecimals * (minCollateralRatio - (1e8 + <number>liquidationPenalty + <number>treasuryFee)));

      let liquidatedWeth = (
          neededRusd * rUsdPrice * (1e8 + <number>liquidationPenalty + <number>treasuryFee) * 10 ** westDecimals
      ) / (westPrice * 10 ** (8 + rUsdPrice));

      let liquidatorReward =
          liquidatedWeth * (1e8 + <number>liquidationPenalty) / (1e8 + <number>liquidationPenalty + <number>treasuryFee);

      let treasuryReward = liquidatedWeth * <number>treasuryFee / (1e8 + <number>liquidationPenalty + <number>treasuryFee);

      let sharesToBurn = (neededRusd * totalShares) / globalDebt;

      if (liquidatorReward + treasuryReward <= debt.Collateral) {
              debt.Collateral -= liquidatorReward + treasuryReward;
      } else {
          debt.Collateral = 0;
      }

      if (sharesToBurn <= debt.Shares) {
              debt.Shares -= sharesToBurn;
              totalShares -= sharesToBurn;
      } else {
          totalShares -= debt.Shares;
          debt.Shares = 0;
      }

      const rusdId = await this.state.get(RusdAddressKey)
      const rusd = await Asset.new(+rusdId);
      await rusd.burn(neededRusd);

      const west = await Asset.new(null);
      await west.transfer(tx.contractId, treasuryReward);
      await west.transfer(tx.sender, liquidatorReward);

      await this.setUserDebt(tx, debt);
      this.state.set(TotalSharesKey, totalShares);
  }

  async getCollateralRatio(tx?:IncomingTx, userAddress?:string):BN {
      let userDebt;
      if (tx) {
          userDebt = await this.getUserDebtFromJsonWithError(tx);
      } else if (userAddress) {
          let userDebtJson = await this.state.get(UserDebtKey.replace(Placeholder, tx.sender.toString()));
          if (userDebtJson !== undefined) {
              userDebt = JSON.parse(<string>userDebtJson);
          } else {
              throw new Error('user is undefined');
          }
      } else {
          throw new Error('non tx or userAddress passed');
      }
      let totalShares = await this.getTotalShares();

      if (totalShares == 0) {
          return BN(0);
      }
      let [rusdPrice, rusdDecimals] = getRusdPrice();
      let [westPrice, westDecimals] = getWestPrice();
      let globalDebt = await this.getGlobalDebt();
      let userDebtTotal = (globalDebt * userDebt.Shares) / totalShares;

      if (userDebtTotal != 0) {
          return BN(westPrice * userDebt.Collateral * 10 ** (BN.add(rusdDecimals, 8)) /
              (rusdPrice * userDebtTotal * 10 ** westDecimals));
      } else if (userDebt.Collateral == 0) {
          return BN(0);
      }
      return BN(MaxCollateralRatio);
  }

  async getGlobalDebt():BN {
      // try to get global debt from blockchain
      let globalDebt = await this.state.get(GlobalDebtKey);
      if (globalDebt === undefined) {
          globalDebt = 0;
      }
      return BN(globalDebt);
  }

  async getMinCollateralRatio():BN {
      let minCollateralRatio = await this.state.get(MinCollateralRatioKey);
      if (minCollateralRatio === undefined) {
          minCollateralRatio = 0;
      }
      return BN(minCollateralRatio);
  }

  async getTotalShares():BN {
      let totalShares = await this.state.get(TotalSharesKey);
      if (totalShares === undefined) {
          totalShares = 0;
      }
      return BN(totalShares);
  }

  // getUserDebtKey returns string "user_{sender address}_debt"
  getUserDebtKey(tx:IncomingTx):string {
      return UserDebtKey.replace(Placeholder, tx.sender.toString());
  }

  // getUserDebtFromJson trying to get user debt info, returns default user debt when there is no such user
  async getUserDebtFromJson(tx:IncomingTx):Promise<UserDebt> {
      let userDebt = UserDebtDefault;
      let userDebtJson = await this.state.get(this.getUserDebtKey(tx));
      if (userDebtJson !== undefined) {
          userDebt = JSON.parse(<string>userDebtJson);
      }
      return userDebt;
  }

  // getUserDebtFromJsonWithError trying to get user debt info, throw error when there is no such user
  async getUserDebtFromJsonWithError(tx:IncomingTx):Promise<UserDebt> {
      let userDebtJson = await this.state.get(this.getUserDebtKey(tx));
      if (userDebtJson === undefined) {
          throw new Error('no such user');
      }
      return JSON.parse(<string>userDebtJson);
  }

  // setUserDebt set user debt to blockchain as json
  setUserDebt(tx:IncomingTx, userDebt:UserDebt):void {
      this.state.set(this.getUserDebtKey(tx), JSON.stringify(userDebt));
  }

  async onlyOwner(tx:IncomingTx) {
      const ownerAddress = await this.state.get(OwnerAddressKey)
      if (ownerAddress === undefined) {
          throw new Error('no owner address info')
      }
      if (tx.sender.toString() != ownerAddress) {
          throw new Error('method allowed only to owner')
      }
  }

  // ================= SYNTH_DEX ==================
    @Action
    async swapFrom(
        @Tx tx: IncomingTx,
        @Param("toSynt") toSynth: string,
        @Payments payment: TransferIn,
    ) {
        if (payment.amount == 0) {
            throw new Error('amount is zero');
        }
        const rusdId = await this.state.get(RusdAddressKey)
        const rusd = await Asset.new(+rusdId);

        if (payment.assetId == rusd.getId()) {
            throw new Error('invalid token');
        }
        await this.getSynthInfoRequired(payment.assetId);
        await this.getSynthInfoRequired(toSynth);

        let [fromPrice, fromDecimals] = getPrice(payment.assetId);
        let [toPrice, toDecimals] = getPrice(toSynth);

        let amountTo = (fromPrice * payment.amount * 10 ** toDecimals) / (toPrice * 10 ** fromDecimals);
        const swapFee = this.state.get(SwapFeeKey)
        let fee = (amountTo * Number(swapFee)) / 1e8;

        const from = await Asset.from(payment.assetId);
        await from.burn(payment.amount);

        const to = await Asset.from(toSynth);
        await to.reissue(fee + amountTo, true);
        await to.transfer(tx.contractId, fee);
        await to.transfer(tx.sender, amountTo);
    }

    // getSynthInfoKey returns string "synth_{synth address}_info"
    getSynthInfoKey(address:string):string {
        return SynthInfoKey.replace(Placeholder, address);
    }

    async getSynthInfoRequired(address: string):Promise<SynthInfo> {
        let synthInfoJson = await this.state.get(this.getSynthInfoKey(address));
        if (synthInfoJson === undefined) {
            throw new Error('no such synth');
        }
        return JSON.parse(<string>synthInfoJson);
    }

    // OWNER FUNCS

    @Action
    async addSynt(
        @Tx tx: IncomingTx,
        @Param("enable_shorts") enableShorts: boolean,
        @Param("name") name: string,
    ) {
        await this.onlyOwner(tx);
        let asset = await Asset.new();
        asset.issue(name, "synth_"+name, 0, 1e8, true);
        let info:SynthInfo = {
            ShortsEnabled: enableShorts, SynthId: asset.getId(), TotalShorts: 0
        }
        this.state.set(this.getSynthInfoKey(asset.getId()), JSON.stringify(info));
    }

    @Action
    async removeSynt(
        @Tx tx: IncomingTx,
        @Param("address") address: string,
    ) {
        await this.onlyOwner(tx);
        await this.getSynthInfoRequired(address);
        this.state.storage.delete(this.getSynthInfoKey(address))
    }

    @Action
    async changeSwapFee(
        @Tx tx: IncomingTx,
        @Param("fee") fee: number,
    ) {
        await this.onlyOwner(tx);
        await this.state.set(SwapFeeKey, fee)
    }

    @Action
    async changeShortsAvailability(
        @Tx tx: IncomingTx,
        @Param("address") address: string,
        @Param("swap_enabled") swapEnabled: boolean,
    ) {
        await this.onlyOwner(tx);
        let info:SynthInfo = await this.state.get(this.getSynthInfoKey(address));
        info.ShortsEnabled = swapEnabled
        this.state.set(this.getSynthInfoKey(address), JSON.stringify(info));
    }
}
