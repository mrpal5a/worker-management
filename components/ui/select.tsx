import type { SelectHTMLAttributes } from 'react';
import { fieldClasses } from './input';

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldClasses} ${className}`} {...props} />;
}
