import { BadRequestException, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Will return all validation errors and their children in a flat array.
 */
const flattenErrors = (arr: ValidationError[]): ValidationError[] => {
  return arr.flatMap((el) => {
    if (Array.isArray(el.children) && el.children.length > 0) {
      return [el, ...flattenErrors(el.children)];
    }
    return [el];
  });
};

/**
 * Accepts an array of validation errors and returns a single message as a string.
 */
export const getValidationErrorMessage = (errors: ValidationError[]): string => {
  const flatErrors = flattenErrors(errors);
  const constraints = flatErrors
    .filter((error) => error.constraints)
    .filter((error, i, array) =>
      array.findIndex((e) => e.property === error.property) === i
    )
    .map((error) => error.constraints);

  const messages = constraints.reduce<string[]>((result, current) => {
    return [...result, ...Object.values(current!)];
  }, []);

  return messages.join(', ');
};

/**
 * This factory function is used to replace the default exception factory of the ValidationPipe.
 * Instead of returning errors as an array of ValidationErrors it will return a string combining
 * all the errors into a single message.
 */
export const validationPipeExceptionFactory = (errors: ValidationError[]) => {
  const message = getValidationErrorMessage(errors);
  return new BadRequestException(message);
};

/**
 * Custom ValidationPipe with consistent error formatting.
 */
export class AppValidationPipe extends ValidationPipe {
  constructor(options: ValidationPipeOptions = {}) {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationPipeExceptionFactory,
      ...options,
    });
  }
}
