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
  const baseClasses = `w-full px-4 py-2.5 rounded-lg bg-neutral-900 border ${
    error ? 'border-red-500' : 'border-neutral-700'
  } text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${
    error ? 'focus:ring-red-500' : 'focus:ring-blue-500'
  } transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">
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
        <p className="mt-1 text-sm text-red-500" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
