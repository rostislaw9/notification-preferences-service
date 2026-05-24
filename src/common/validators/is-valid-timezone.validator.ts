import { DateTime } from 'luxon';
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsValidTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: string): boolean {
    if (typeof timezone !== 'string') return false;
    // Luxon throws for invalid timezones when creating DateTime
    try {
      const dt = DateTime.now().setZone(timezone);
      return dt.isValid;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid IANA timezone (e.g., 'Europe/Berlin', 'America/New_York')`;
  }
}

export function IsValidTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimezoneConstraint,
    });
  };
}
