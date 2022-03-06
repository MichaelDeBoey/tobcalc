import { ServiceTransaction } from "./service_adapter.ts";
import { CountryCode, CurrencyCode, SecurityType } from "./enums.ts";
import { FormRow, getTaxableTransactions, getTaxFormData, getTaxRate, TaxableTransaction } from "./tax.ts";
import { assertEquals } from "https://deno.land/std@0.128.0/testing/asserts.ts";

Deno.test({
    name: "service transactions -> taxable transactions with exchange rates and security types",
    permissions: {
        net: true,
    },
    fn: async () => {
        const serviceTransactions: ServiceTransaction[] = [
            {
                date: new Date("21 February 2022 00:00:00 GMT"),
                isin: "IE00B4L5Y983", // IWDA
                currency: CurrencyCode.EUR,
                value: 1000_00,
            },
            {
                date: new Date("25 February 2022 00:00:00 GMT"),
                isin: "US0378331005", // AAPL,
                currency: CurrencyCode.USD,
                value: 100_00, // EURUSD on 25 Feb -> 1.1216
            },
        ];
        const taxableTransactions = await getTaxableTransactions(serviceTransactions);

        const taxableTransactionIWDA = taxableTransactions[0];
        assertEquals(taxableTransactionIWDA, <TaxableTransaction> {
            value: 1000_00,
            countryCode: CountryCode.Ireland,
            security: {
                type: SecurityType.ETF,
                accumulating: true,
            },
        });

        const taxableTransactionAAPL = taxableTransactions[1];
        const exchangeRate = 1.1216;
        assertEquals(taxableTransactionAAPL, <TaxableTransaction> {
            value: 100_00 * exchangeRate,
            countryCode: CountryCode.UnitedStates,
            security: {
                type: SecurityType.Stock,
            },
        });
    },
});

Deno.test({
    name: "tax rates for different combinations of securities and domiciles",
    fn: () => {
        assertEquals(getTaxRate({ // ETF in EEA, accumulating
            value: 100_00,
            security: {
                type: SecurityType.ETF,
                accumulating: true,
            },
            countryCode: CountryCode.Ireland,
        }), 0.0012);

        assertEquals(getTaxRate({ // ETF in EEA, distributing
            value: 100_00,
            security: {
                type: SecurityType.ETF,
                accumulating: false,
            },
            countryCode: CountryCode.Ireland,
        }), 0.0012);

        assertEquals(getTaxRate({ // ETF not in EEA, accumulating
            value: 100_00,
            security: {
                type: SecurityType.ETF,
                accumulating: true,
            },
            countryCode: CountryCode.Switzerland,
        }), 0.0035);

        assertEquals(getTaxRate({ // ETF not in EEA, distributing
            value: 100_00,
            security: {
                type: SecurityType.ETF,
                accumulating: false,
            },
            countryCode: CountryCode.Switzerland,
        }), 0.0035);

        assertEquals(getTaxRate({ // ETF in Belgium, accumulating
            value: 100_00,
            security: {
                type: SecurityType.ETF,
                accumulating: true,
            },
            countryCode: CountryCode.Belgium,
        }), 0.0132);

        assertEquals(getTaxRate({ // ETF in Belgium, distributing
            value: 100_00,
            security: {
                type: SecurityType.ETF,
                accumulating: false,
            },
            countryCode: CountryCode.Belgium,
        }), 0.0012);

        assertEquals(getTaxRate({ // Stock (in US)
            value: 100_00,
            security: {
                type: SecurityType.Stock,
            },
            countryCode: CountryCode.UnitedStates,
        }), 0.0035);
    },
});

Deno.test({
    name: "tax form data for taxable transactions",
    fn: () => {
        const taxableTransactions: TaxableTransaction[] = [
            { // ETF in EEA, accumulating       0.0012
                value: 100_00,
                security: {
                    type: SecurityType.ETF,
                    accumulating: true,
                },
                countryCode: CountryCode.Ireland,
            },
            { // ETF in EEA, distributing       0.0012
                value: 100_00,
                security: {
                    type: SecurityType.ETF,
                    accumulating: false,
                },
                countryCode: CountryCode.Ireland,
            },
            { // ETF not in EEA, accumulating   0.0035
                value: 100_00,
                security: {
                    type: SecurityType.ETF,
                    accumulating: true,
                },
                countryCode: CountryCode.Switzerland,
            },
            { // ETF not in EEA, distributing   0.0035
                value: 100_00,
                security: {
                    type: SecurityType.ETF,
                    accumulating: false,
                },
                countryCode: CountryCode.Switzerland,
            },
            { // ETF in Belgium, accumulating   0.0132
                value: 100_00,
                security: {
                    type: SecurityType.ETF,
                    accumulating: true,
                },
                countryCode: CountryCode.Belgium,
            },
            { // ETF in Belgium, distributing   0.0012
                value: 100_00,
                security: {
                    type: SecurityType.ETF,
                    accumulating: false,
                },
                countryCode: CountryCode.Belgium,
            },
            { // Stock (in US)  0.0035
                value: 100_00,
                security: {
                    type: SecurityType.Stock,
                },
                countryCode: CountryCode.UnitedStates,
            }
        ];
        const taxFormData = getTaxFormData(taxableTransactions);
        assertEquals(taxFormData.get(0.0012), <FormRow> {
            quantity: 3,
            taxableValue: 300_00,
            taxValue: 0.0012 * 300_00,
        });
        assertEquals(taxFormData.get(0.0035), <FormRow> {
            quantity: 3,
            taxableValue: 300_00,
            taxValue: 0.0035 * 300_00,
        });
        assertEquals(taxFormData.get(0.0132), <FormRow> {
            quantity: 1,
            taxableValue: 100_00,
            taxValue: 0.0132 * 100_00,
        });
    },
});
