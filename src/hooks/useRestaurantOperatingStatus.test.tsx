import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRestaurantOperatingStatus } from './useRestaurantOperatingStatus';

const mocks = vi.hoisted(() => ({ read: vi.fn(), from: vi.fn(), authenticatedRead: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.authenticatedRead },
}));
vi.mock('@/lib/publicRestaurantClient', () => ({
  publicRestaurantClient: { from: mocks.from },
}));

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

describe('customer store status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.read.mockReset();
    mocks.from.mockReset();
    mocks.authenticatedRead.mockReset();
    const query = {
      select: () => query,
      eq: () => query,
      abortSignal: () => query,
      maybeSingle: mocks.read,
    };
    mocks.from.mockReturnValue(query);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('uses the public manual toggle even outside operating hours', async () => {
    mocks.read.mockResolvedValue({ data: { is_accepting_orders: true, operating_hours_start: '00:00', operating_hours_end: '00:01' }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await flush();
    expect(mocks.from).toHaveBeenCalledWith('restaurants_public');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.unavailable).toBe(false);
  });

  it('recovers a failed customer read automatically after 3 seconds', async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: { message: 'Network failure' } })
      .mockResolvedValue({ data: { is_accepting_orders: true }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await flush();
    expect(result.current.unavailable).toBe(true);
    expect(result.current.isOpen).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.unavailable).toBe(false);
  });

  it('reads the manual toggle without touching a broken customer session', async () => {
    mocks.authenticatedRead.mockImplementation(() => { throw new Error('Session refresh failed'); });
    mocks.read.mockResolvedValue({ data: { is_accepting_orders: true }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await flush();
    expect(result.current.isOpen).toBe(true);
    expect(mocks.authenticatedRead).not.toHaveBeenCalled();
  });

  it('reports closed when the public manual toggle is false', async () => {
    mocks.read.mockResolvedValue({ data: { is_accepting_orders: false }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await flush();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.unavailable).toBe(false);
  });

  it('picks up reopening without receiving a realtime event', async () => {
    mocks.read.mockResolvedValueOnce({ data: { is_accepting_orders: false }, error: null })
      .mockResolvedValue({ data: { is_accepting_orders: true }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await flush();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.unavailable).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(result.current.isOpen).toBe(true);
  });

  it.each(['focus', 'online'])('refreshes immediately on %s', async (event) => {
    mocks.read.mockResolvedValueOnce({ data: { is_accepting_orders: false }, error: null })
      .mockResolvedValue({ data: { is_accepting_orders: true }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await flush();
    await act(async () => { window.dispatchEvent(new Event(event)); });
    expect(result.current.isOpen).toBe(true);
    expect(mocks.read).toHaveBeenCalledTimes(2);
  });

  it('does not let an older closed response overwrite a newer open response', async () => {
    let resolveOld: ((value: unknown) => void) | undefined;
    mocks.read.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue({ data: { is_accepting_orders: true }, error: null });
    const { result } = renderHook(() => useRestaurantOperatingStatus('nosty'));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(result.current.isOpen).toBe(true);
    await act(async () => { resolveOld?.({ data: { is_accepting_orders: false }, error: null }); });
    expect(result.current.isOpen).toBe(true);
  });
});