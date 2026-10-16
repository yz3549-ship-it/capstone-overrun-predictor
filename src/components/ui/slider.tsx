'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type SliderProps = Omit<
  React.ComponentProps<'input'>,
  'defaultValue' | 'onChange' | 'type' | 'value'
> & {
  defaultValue?: number[];
  value?: number[];
  onValueChange?: (value: number[]) => void;
};

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueChange,
  style,
  ...props
}: SliderProps) {
  const currentValue = value?.[0];
  const initialValue = defaultValue?.[0];
  const numericMin = Number(min);
  const numericMax = Number(max);
  const numericValue = currentValue ?? initialValue ?? numericMin;
  const progress =
    numericMax === numericMin
      ? 0
      : ((numericValue - numericMin) / (numericMax - numericMin)) * 100;

  return (
    <div className={cn('relative flex h-10 w-full items-center', className)}>
      <input
        {...props}
        type="range"
        min={min}
        max={max}
        value={currentValue}
        defaultValue={currentValue === undefined ? initialValue : undefined}
        onChange={(event) => onValueChange?.([Number(event.currentTarget.value)])}
        className="native-slider h-10 w-full cursor-grab appearance-none bg-transparent active:cursor-grabbing"
        style={
          {
            '--slider-progress': `${Math.min(100, Math.max(0, progress))}%`,
            ...style,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

export { Slider };
