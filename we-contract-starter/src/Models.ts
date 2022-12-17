import BN from 'bn.js'

export default interface UserDebt {
    Minted:BN|null;
    Collateral:BN|null;
    Shares:BN|null;
}

export const UserDebtDefault:UserDebt = {
    Minted: BN,
    Collateral: BN,
    Shares: BN
}