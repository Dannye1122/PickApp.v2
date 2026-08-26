import React, { useState, useEffect, useRef } from 'react';
import { ShiftData } from '../types';

export function useDeviceMotion(
  hapticEnabled: boolean,
  deviceHapticService: (type?: 'light' | 'medium' | 'heavy') => void,
  setShiftData: React.Dispatch<React.SetStateAction<ShiftData>>
) {
  const [isMotionGranted, setIsMotionGranted] = useState(false);
  const lastStepTime = useRef<number>(0);
  const stepState = useRef({
    movingAverage: 0,
    baseline: 9.81,
    isPeak: false,
    initialized: false
  });

  const requestMotionPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceMotionEvent as any) !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsMotionGranted(true);
        }
      } catch (e) {
        // Device motion permission rejected or prompt closed
      }
    } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      setIsMotionGranted(true);
    }
  };

  useEffect(() => {
    requestMotionPermission();
  }, []);

  useEffect(() => {
    if (!isMotionGranted) return;

    const handleMotion = (e: DeviceMotionEvent) => {
      let mag = 0;
      let isLinear = false;

      // Prefer linear acceleration (gravity component removed by hardware sensor fusion)
      if (e.acceleration && (e.acceleration.x !== null || e.acceleration.y !== null || e.acceleration.z !== null)) {
        const ax = e.acceleration.x || 0;
        const ay = e.acceleration.y || 0;
        const az = e.acceleration.z || 0;
        const linearMag = Math.sqrt(ax * ax + ay * ay + az * az);
        if (linearMag > 0.01) {
          mag = linearMag;
          isLinear = true;
        }
      }

      if (!isLinear && e.accelerationIncludingGravity) {
        const gx = e.accelerationIncludingGravity.x || 0;
        const gy = e.accelerationIncludingGravity.y || 0;
        const gz = e.accelerationIncludingGravity.z || 0;
        mag = Math.sqrt(gx * gx + gy * gy + gz * gz);
      }

      if (mag === 0) return;

      if (!stepState.current.initialized) {
        stepState.current.baseline = mag;
        stepState.current.movingAverage = mag;
        stepState.current.initialized = true;
        return;
      }

      // Exponential moving average filter for noise suppression
      stepState.current.baseline = (stepState.current.baseline * 0.99) + (mag * 0.01);
      stepState.current.movingAverage = (stepState.current.movingAverage * 0.72) + (mag * 0.28);

      // Adaptive threshold calculation
      const dynamicThreshold = isLinear
        ? 1.15 // 1.15 m/s^2 linear acceleration peak threshold
        : Math.max(0.85, stepState.current.baseline * 0.08); // Gravity-relative threshold (~0.85 m/s^2 above baseline)

      if (stepState.current.movingAverage > stepState.current.baseline + dynamicThreshold) {
        stepState.current.isPeak = true;
      }

      // Detect peak fall-off (foot strike completion)
      if (stepState.current.isPeak && stepState.current.movingAverage < stepState.current.baseline + (dynamicThreshold * 0.35)) {
        const currentTime = Date.now();
        const delta = currentTime - lastStepTime.current;

        // Human walking cadence constraint: 250ms to 1400ms per step (~42-240 steps/min)
        if (delta > 250 && delta < 1400) {
          lastStepTime.current = currentTime;
          stepState.current.isPeak = false;

          const currentBackup = parseInt(localStorage.getItem('shiftStepBackup') || '0', 10);
          const nextBackup = currentBackup + 1;
          localStorage.setItem('shiftStepBackup', nextBackup.toString());

          setShiftData((prev: any) => ({ ...prev, steps: nextBackup }));

          if (hapticEnabled) deviceHapticService('light');
        } else if (delta >= 1400) {
          // Reset peak state if time between strides exceeds walking window
          lastStepTime.current = currentTime;
          stepState.current.isPeak = false;
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isMotionGranted, hapticEnabled, deviceHapticService, setShiftData]);

  return { isMotionGranted, requestMotionPermission };
}
