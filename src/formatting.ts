export function formatMoney(value: number, currencyCode = "€") {
    let decimals = Math.ceil(value % 100);
    // Math.ceil(1_99.99 % 100 = 99.99) = 100
    // Then we want to change the value to 2_00 and make the remainder 0
    if(decimals == 100) {
        decimals = 0;
        value += 1;
    }
    const formattedDecimals = decimals < 10 ? `0${decimals}` : `${decimals}`;
    return `${currencyCode} ${Math.floor((value - value % 100) / 100)},${formattedDecimals}`;
}
