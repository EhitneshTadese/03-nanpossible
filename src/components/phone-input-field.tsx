"use client";

import { useState } from "react";
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import type { E164Number, CountryCode } from "libphonenumber-js";
import "react-phone-number-input/style.css";

type PhoneInputFieldProps = {
  defaultPhone?: string | null;
  defaultCountryCode?: string | null;
};

export function PhoneInputField({
  defaultPhone,
  defaultCountryCode,
}: PhoneInputFieldProps) {
  const [value, setValue] = useState<E164Number | undefined>(
    (defaultPhone as E164Number) ?? undefined,
  );

  const derivedCountry =
    (value ? parsePhoneNumber(value)?.country : undefined) ??
    (defaultCountryCode as CountryCode | undefined) ??
    undefined;

  return (
    <div className="phone-input-wrapper">
      <PhoneInput
        defaultCountry={derivedCountry}
        international
        onChange={setValue}
        placeholder="Phone (optional)"
        value={value}
        className="field-input"
      />
      <input name="phone" type="hidden" value={value ?? ""} />
      <input name="phone_country_code" type="hidden" value={derivedCountry ?? ""} />
    </div>
  );
}