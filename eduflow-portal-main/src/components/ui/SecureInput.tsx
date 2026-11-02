import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  maxLen?: number;
  blockQuotes?: boolean;
}

// Dangerous characters used in SQL Injection and Cross-Site Scripting
const DANGEROUS_CHARS_REGEX = /[<>"';`\\]|--|\/\*|\*\//g;

export const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ label, value, onChange, maxLen = 255, className = '', ...props }, ref) => {
    const [blockedMessage, setBlockedMessage] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      // 1. Buffer overflow protection: enforce character length limit
      if (raw.length > maxLen) {
        setBlockedMessage(`تم الوصول للحد الأقصى المسموح به (${maxLen} حرف).`);
        setTimeout(() => setBlockedMessage(''), 3000);
        return;
      }

      // 2. Injection token check
      const matched = raw.match(DANGEROUS_CHARS_REGEX);
      if (matched && matched.length > 0) {
        const forbidden = matched[0];
        setBlockedMessage(`⚠️ الرمز "${forbidden}" محظور أمنياً لحماية النظام من هجمات الحقن (SQLi & XSS).`);
        setTimeout(() => setBlockedMessage(''), 3500);

        // Strip the dangerous characters cleanly
        raw = raw.replace(DANGEROUS_CHARS_REGEX, '');
        e.target.value = raw;
      }

      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span>{label}</span>
            {maxLen && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {String(value || '').length}/{maxLen}
              </span>
            )}
          </div>
        )}

        <Input
          ref={ref}
          value={value}
          onChange={handleChange}
          className={`${className} ${blockedMessage ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          {...props}
        />

        {blockedMessage && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20 animate-in fade-in duration-200">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-destructive" />
            <span>{blockedMessage}</span>
          </div>
        )}
      </div>
    );
  }
);

SecureInput.displayName = 'SecureInput';
