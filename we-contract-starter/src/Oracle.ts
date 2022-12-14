import BN from 'bn.js'

export function getRusdPrice():[BN,BN] {
    return BN(1e8);
}

export function getWestPrice():[BN,BN] {
    return BN(1e8);
}

export function getEastPrice():[BN,BN] {
    return BN(1e8);
}

export function getPrice(address: string):[BN, BN] {
    return [1e4, 15];
}