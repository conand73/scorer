export function useVibration() {
  const vibrate = (pattern: number | number[]) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Vibration not available
    }
  };

  return {
    increment: () => vibrate(10),
    decrement: () => vibrate(15),
    serveChange: () => vibrate([5, 30, 5]),
    setWon: () => vibrate([20, 50, 20, 50, 30]),
    matchWon: () => vibrate([30, 50, 30, 50, 30, 50, 50]),
    error: () => vibrate(50),
  };
}
