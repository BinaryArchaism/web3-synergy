import {Address} from "@wavesenterprise/contract-core";

interface UserDebt {
    minted:number; // total rUSD minted
    collateral:number; // collateral in WEST
    shares:BigInteger; // share of global debt (18 decimals)
}

interface ISynergy {
    mint(amount:number):void;
    deposit(amount:number):void; // deposit WEST
    burn(amount:number):void;
    withdraw(amount:number):void; // withdraw WEST
    globalDebt():number;
    collateralRatio(user:string):number;
    userDebt(user:string):number;
    predictCollateralRatio(user:string, amountToMint:number, amountToPledge:number, increase:boolean):number;
    minCollateralRatio():number;
    liquidationCollateralRatio():number;
    liquidationPenalty():number;
    treasuryFee():number;
    setMinCollateralRatio(minCollateralRatio:number):void;
    setLiquidationCollateralRatio(liquidationCollateralRatio:number):void;
    setLiquidationPenalty(liquidationPenalty:number):void;
    setTreasuryFee(treasuryFee:number):void;
    liquidate(user:number):void;
}

export default class Synergy implements ISynergy {
    burn(amount: number): void {
    }

    collateralRatio(user: string): number {
        return 0;
    }

    deposit(amount: number): void {
    }

    globalDebt(): number {
        return 0;
    }

    liquidate(user: number): void {
    }

    liquidationCollateralRatio(): number {
        return 0;
    }

    liquidationPenalty(): number {
        return 0;
    }

    minCollateralRatio(): number {
        return 0;
    }

    mint(amount: number): void {
    }

    predictCollateralRatio(user: string, amountToMint: number, amountToPledge: number, increase: boolean): number {
        return 0;
    }

    setLiquidationCollateralRatio(liquidationCollateralRatio: number): void {
    }

    setLiquidationPenalty(liquidationPenalty: number): void {
    }

    setMinCollateralRatio(minCollateralRatio: number): void {
    }

    setTreasuryFee(treasuryFee: number): void {
    }

    treasuryFee(): number {
        return 0;
    }

    userDebt(user: string): number {
        return 0;
    }

    withdraw(amount: number): void {
    }

}