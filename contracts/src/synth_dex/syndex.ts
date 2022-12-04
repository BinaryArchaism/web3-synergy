import {Action, Asset, Contract, ContractState, Ctx, Param, Payments, State} from "@wavesenterprise/contract-core";


// ISyndex interfaces of synth dex
interface ISyndex {
    mint(amount:number):void;
    deposit(amount:number):void;
    burn(amount:number):void;
    withdraw(amount:number):void;
    globalDebt():number;
    collateralRatio(address:string):void;
    userDebt(address:string):number;
    predictCollateralRation(address:string, amountToMint:number, amountToPladge:number, increase:boolean):number;
    minCollateralRatio():number;
    liquidationCollateralRatio():number;
    liquidationPenalty():number;
    treasuryFee():number;
    setMinCollateralRatio(minCollateralRatio:number):void;
    setLiquidationCollateralRatio(liquidationCollateralRatio:number):void;
    setLiquidationPenalty(liquidationPenalty:number):void;
    setTreasuryFee(treasuryFee:number):void;
    liquidate(address:string):void;
}

// @Action
// async SetWEastPrice(
//     @Param('west_price') westPrice: number,
//     @Param('east_price') eastPrice: number,
// ) {
//     await this.onlyAdmin()

//     let price: WEastPrice = {
//         WestPrice: Number.parseInt(String(westPrice)),
//         EastPrice: Number.parseInt(String(eastPrice)),
//     }
//     const jsonPrice = JSON.stringify(price)
//     this.state.setString("weast_price", jsonPrice)
// }

export default class Syndex implements ISyndex {
    @State() state: ContractState;
    @Ctx context: Context;

    @Action
    async mint(
        @Param('amount') amount: number,
    ): Promise<void> {
        console.log(amount);
    }
    deposit(amount: number): void {
        throw new Error("Method not implemented.");
    }
    burn(amount: number): void {
        throw new Error("Method not implemented.");
    }
    withdraw(amount: number): void {
        throw new Error("Method not implemented.");
    }
    globalDebt(): number {
        throw new Error("Method not implemented.");
    }
    collateralRatio(address: string): void {
        throw new Error("Method not implemented.");
    }
    userDebt(address: string): number {
        throw new Error("Method not implemented.");
    }
    predictCollateralRation(address: string, amountToMint: number, amountToPladge: number, increase: boolean): number {
        throw new Error("Method not implemented.");
    }
    minCollateralRatio(): number {
        throw new Error("Method not implemented.");
    }
    liquidationCollateralRatio(): number {
        throw new Error("Method not implemented.");
    }
    liquidationPenalty(): number {
        throw new Error("Method not implemented.");
    }
    treasuryFee(): number {
        throw new Error("Method not implemented.");
    }
    setMinCollateralRatio(minCollateralRatio: number): void {
        throw new Error("Method not implemented.");
    }
    setLiquidationCollateralRatio(liquidationCollateralRatio: number): void {
        throw new Error("Method not implemented.");
    }
    setLiquidationPenalty(liquidationPenalty: number): void {
        throw new Error("Method not implemented.");
    }
    setTreasuryFee(treasuryFee: number): void {
        throw new Error("Method not implemented.");
    }
    liquidate(address: string): void {
        throw new Error("Method not implemented.");
    }
}