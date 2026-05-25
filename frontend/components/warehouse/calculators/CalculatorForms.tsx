'use client';

import { ChangeEvent } from 'react';
import type { CalculatorType } from './calculators';

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-violet-400 focus:outline-none';

function NumInput({
  value,
  onChange,
  step,
  min,
  placeholder,
}: {
  value: number | '';
  onChange: (v: number) => void;
  step?: string;
  min?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? 'any'}
      min={min ?? '0'}
      value={value === '' ? '' : value}
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onChange(v === '' ? 0 : Number(v));
      }}
      className={inputCls}
    />
  );
}

function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// -------- Screed form --------
export interface ScreedFormState {
  area: number;
  thickness: number;
  mixType: 'cement_sand' | 'dry' | 'leveling';
  forWarmFloor: boolean;
}

export function ScreedForm({
  state,
  onChange,
}: {
  state: ScreedFormState;
  onChange: (s: ScreedFormState) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Площадь, м²">
        <NumInput value={state.area} onChange={(v) => onChange({ ...state, area: v })} placeholder="например, 50" />
      </Field>
      <Field label="Толщина, см" hint="Мин. 3 см (обычная) или 5 см (под тёплый пол)">
        <NumInput value={state.thickness} onChange={(v) => onChange({ ...state, thickness: v })} placeholder="5" />
      </Field>
      <Field label="Тип смеси">
        <SelectInput
          value={state.mixType}
          onChange={(v) => onChange({ ...state, mixType: v })}
          options={[
            { value: 'cement_sand', label: 'Цементно-песчаная (ЦПС)' },
            { value: 'dry', label: 'Сухая (керамзит + ГВЛ)' },
            { value: 'leveling', label: 'Самовыравнивающаяся' },
          ]}
        />
      </Field>
      <Field label="Под тёплый пол">
        <label className="flex items-center gap-2 mt-1.5">
          <input
            type="checkbox"
            checked={state.forWarmFloor}
            onChange={(e) => onChange({ ...state, forWarmFloor: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Да, с теплоизоляцией</span>
        </label>
      </Field>
    </div>
  );
}

// -------- Warm floor form --------
export interface WarmFloorFormState {
  area: number;
  pitchCm: number;
  screedThicknessCm: number;
  systemType: 'water' | 'electric_cable' | 'electric_mat';
}

export function WarmFloorForm({
  state,
  onChange,
}: {
  state: WarmFloorFormState;
  onChange: (s: WarmFloorFormState) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Тип системы">
        <SelectInput
          value={state.systemType}
          onChange={(v) => onChange({ ...state, systemType: v })}
          options={[
            { value: 'water', label: 'Водяной контур' },
            { value: 'electric_cable', label: 'Электрический кабель' },
            { value: 'electric_mat', label: 'Нагревательный мат' },
          ]}
        />
      </Field>
      <Field label="Площадь, м²">
        <NumInput value={state.area} onChange={(v) => onChange({ ...state, area: v })} placeholder="20" />
      </Field>
      {state.systemType !== 'electric_mat' && (
        <Field label="Шаг укладки, см" hint="Обычно 10–30 см">
          <NumInput value={state.pitchCm} onChange={(v) => onChange({ ...state, pitchCm: v })} placeholder="15" />
        </Field>
      )}
      <Field label="Толщина стяжки над контуром, см" hint="Мин. 5 см для воды">
        <NumInput
          value={state.screedThicknessCm}
          onChange={(v) => onChange({ ...state, screedThicknessCm: v })}
          placeholder="6"
        />
      </Field>
    </div>
  );
}

// -------- Electrics form --------
export interface ElectricsFormState {
  powerKw: number;
  voltageV: 220 | 380;
  lengthM: number;
  circuitType: 'lighting' | 'sockets' | 'range' | 'heavy';
}

export function ElectricsForm({
  state,
  onChange,
}: {
  state: ElectricsFormState;
  onChange: (s: ElectricsFormState) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Тип группы">
        <SelectInput
          value={state.circuitType}
          onChange={(v) => onChange({ ...state, circuitType: v })}
          options={[
            { value: 'lighting', label: 'Освещение' },
            { value: 'sockets', label: 'Розетки бытовые' },
            { value: 'range', label: 'Варочная панель/духовка' },
            { value: 'heavy', label: 'Силовая нагрузка' },
          ]}
        />
      </Field>
      <Field label="Напряжение, В">
        <SelectInput
          value={String(state.voltageV) as '220' | '380'}
          onChange={(v) => onChange({ ...state, voltageV: Number(v) as 220 | 380 })}
          options={[
            { value: '220', label: '220 В (однофазное)' },
            { value: '380', label: '380 В (трёхфазное)' },
          ]}
        />
      </Field>
      <Field label="Суммарная мощность, кВт">
        <NumInput value={state.powerKw} onChange={(v) => onChange({ ...state, powerKw: v })} placeholder="3.5" />
      </Field>
      <Field label="Длина кабеля от щита, м">
        <NumInput value={state.lengthM} onChange={(v) => onChange({ ...state, lengthM: v })} placeholder="20" />
      </Field>
    </div>
  );
}

// -------- Plaster form --------
export interface PlasterFormState {
  area: number;
  thicknessMm: number;
  plasterType: 'gypsum' | 'cement';
}

export function PlasterForm({
  state,
  onChange,
}: {
  state: PlasterFormState;
  onChange: (s: PlasterFormState) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Площадь стен/потолка, м²">
        <NumInput value={state.area} onChange={(v) => onChange({ ...state, area: v })} placeholder="80" />
      </Field>
      <Field label="Толщина слоя, мм" hint="Мин. 5 мм">
        <NumInput value={state.thicknessMm} onChange={(v) => onChange({ ...state, thicknessMm: v })} placeholder="15" />
      </Field>
      <Field label="Тип штукатурки">
        <SelectInput
          value={state.plasterType}
          onChange={(v) => onChange({ ...state, plasterType: v })}
          options={[
            { value: 'gypsum', label: 'Гипсовая (внутри помещения)' },
            { value: 'cement', label: 'Цементная (фасад, влажные)' },
          ]}
        />
      </Field>
    </div>
  );
}

// -------- Tile form --------
export interface TileFormState {
  area: number;
  tileWidthCm: number;
  tileLengthCm: number;
  wastePercent: number;
  jointMm: number;
}

export function TileForm({
  state,
  onChange,
}: {
  state: TileFormState;
  onChange: (s: TileFormState) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Площадь, м²">
        <NumInput value={state.area} onChange={(v) => onChange({ ...state, area: v })} placeholder="12" />
      </Field>
      <Field label="Запас на подрезку, %" hint="Обычно 10%, для диагонали — 15%">
        <NumInput value={state.wastePercent} onChange={(v) => onChange({ ...state, wastePercent: v })} placeholder="10" />
      </Field>
      <Field label="Ширина плитки, см">
        <NumInput value={state.tileWidthCm} onChange={(v) => onChange({ ...state, tileWidthCm: v })} placeholder="30" />
      </Field>
      <Field label="Длина плитки, см">
        <NumInput value={state.tileLengthCm} onChange={(v) => onChange({ ...state, tileLengthCm: v })} placeholder="60" />
      </Field>
      <Field label="Ширина шва, мм">
        <NumInput value={state.jointMm} onChange={(v) => onChange({ ...state, jointMm: v })} placeholder="2" />
      </Field>
    </div>
  );
}

export type AnyCalcState =
  | { type: 'screed'; state: ScreedFormState }
  | { type: 'warm_floor'; state: WarmFloorFormState }
  | { type: 'electrics'; state: ElectricsFormState }
  | { type: 'plaster'; state: PlasterFormState }
  | { type: 'tile'; state: TileFormState };

export function defaultStateFor(type: CalculatorType): AnyCalcState {
  switch (type) {
    case 'screed':
      return { type, state: { area: 0, thickness: 0, mixType: 'cement_sand', forWarmFloor: false } };
    case 'warm_floor':
      return { type, state: { area: 0, pitchCm: 15, screedThicknessCm: 5, systemType: 'water' } };
    case 'electrics':
      return { type, state: { powerKw: 0, voltageV: 220, lengthM: 0, circuitType: 'sockets' } };
    case 'plaster':
      return { type, state: { area: 0, thicknessMm: 15, plasterType: 'gypsum' } };
    case 'tile':
      return {
        type,
        state: { area: 0, tileWidthCm: 30, tileLengthCm: 60, wastePercent: 10, jointMm: 2 },
      };
  }
}
