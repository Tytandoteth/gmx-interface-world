import { Bar } from "domain/tradingview/types";

/**
 * Parse raw oracle candle data into a Bar object
 * @param rawCandle Raw candle data array
 * @returns Bar object
 */
export function parseOracleCandle(rawCandle: number[]): Bar {
  const [time, open, high, low, close] = rawCandle;

  return {
    time,
    open,
    high,
    low,
    close,
  };
}
