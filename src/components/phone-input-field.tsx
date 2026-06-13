"use client";

import { useState } from "react";
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js";
import "react-phone-number-input/style.css";

type PhoneInputFieldProps = {
  /** Current full phone value (E.164 like "+2348012345678", or raw like "08012345678") */
  defaultPhone?: string | null;
  /** ISO 3166-1 alpha-2 country code stored separately, e.g. "NG" */
  defaultCountryCode?: string | null;
};

/**
 * Renders a flag-dropdown + number input.
 * Submits two hidden fields to the server action:
 *   - `phone`              — full E.164 number  e.g. "+2348012345678"
 *   - `phone_country_code` — ISO country code   e.g. "NG"
 *
 * Place this inside any <form> that posts to a server action.
 */
export function PhoneInputField({
  defaultPhone,
  defaultCountryCode,
}: PhoneInputFieldProps) {
  const [value, setValue] = useState<E164Number | undefined>(
    (defaultPhone as E164Number) ?? undefined,
  );

  const derivedCountry =
    (value ? parsePhoneNumber(value)?.country : undefined) ??
    (defaultCountryCode as import("libphonenumber-js").CountryCode | undefined) ??
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