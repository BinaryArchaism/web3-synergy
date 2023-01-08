import BN from 'bn.js'

export interface UserDebt {
    Minted:BN|null;
    Collateral:BN|null;
    Shares:BN|null;
}

export const UserDebtDefault:UserDebt = {
    Minted: BN,
    Collateral: BN,
    Shares: BN
}

export interface SynthInfo {
    SynthId:string;
    TotalShorts:number;
    ShortsEnabled:boolean;
}