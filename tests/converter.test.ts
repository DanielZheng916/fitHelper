import { describe, it, expect } from 'vitest';
import { mphToMinKm, minKmToMph } from '../src/main/ipc/converter';

describe('mphToMinKm', () => {
  it('should convert 5.2 mph correctly', () => {
    const result = mphToMinKm(5.2);
    expect(result).toMatch(/^7:\d{2} min\/km$/);
    const match = result!.match(/^(\d+):(\d{2})/);
    const totalSec = parseInt(match![1]) * 60 + parseInt(match![2]);
    expect(totalSec).toBeGreaterThan(400);
    expect(totalSec).toBeLessThan(460);
  });

  it('should convert 6.0 mph correctly', () => {
    const result = mphToMinKm(6.0);
    expect(result).toMatch(/^6:\d{2} min\/km$/);
  });

  it('should return null for 0 mph', () => {
    expect(mphToMinKm(0)).toBeNull();
  });

  it('should return null for negative mph', () => {
    expect(mphToMinKm(-3)).toBeNull();
  });
});

describe('minKmToMph', () => {
  it('should convert 6:46 min/km to a valid mph', () => {
    const result = minKmToMph('6:46');
    expect(result).toMatch(/^\d+(\.\d)? mph$/);
    const mph = parseFloat(result!);
    expect(mph).toBeGreaterThan(5);
    expect(mph).toBeLessThan(6);
  });

  it('should convert 7:10 min/km to a valid mph', () => {
    const result = minKmToMph('7:10');
    expect(result).not.toBeNull();
    const mph = parseFloat(result!);
    expect(mph).toBeGreaterThan(4.5);
    expect(mph).toBeLessThan(5.5);
  });

  it('should return null for invalid format', () => {
    expect(minKmToMph('abc')).toBeNull();
    expect(minKmToMph('6:70')).toBeNull();
    expect(minKmToMph('0:00')).toBeNull();
  });
});

describe('Round-trip conversion', () => {
  it('mph -> min/km -> mph should approximate original', () => {
    const original = 5.5;
    const minKm = mphToMinKm(original)!;
    const timeStr = minKm.replace(' min/km', '');
    const backToMph = minKmToMph(timeStr)!;
    const roundTrip = parseFloat(backToMph);
    expect(Math.abs(roundTrip - original)).toBeLessThan(0.2);
  });
});
