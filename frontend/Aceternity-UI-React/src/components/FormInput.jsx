import React from 'react';

/**
 * Reusable form input with error display
 */
export default function FormInput({
  label,
  name,
  type = 'text',
  register,
  error,
  placeholder,
  required,
  options,
  rows,
  disabled,
  ...rest
}) {
  const baseClasses = `w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border ${
    error ? 'border-red-500 focus:border-red-500' : 'border-[#E8E2D7] focus:border-orange-500 focus:bg-white'
  } text-[#111827] placeholder-[#A8A29E] text-sm focus:outline-none transition-all ${
    disabled ? 'opacity-60 cursor-not-allowed bg-stone-100' : ''
  }`;

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select {...register(name)} className={baseClasses} disabled={disabled} {...rest}>
          <option value="">-- Select --</option>
          {options?.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          {...register(name)}
          className={baseClasses}
          placeholder={placeholder}
          rows={rows || 4}
          disabled={disabled}
          {...rest}
        />
      ) : (
        <input
          type={type}
          {...register(name)}
          className={baseClasses}
          placeholder={placeholder}
          disabled={disabled}
          {...rest}
        />
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
