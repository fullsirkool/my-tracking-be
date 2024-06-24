export function exclude<Model, Key extends keyof Model>(
  model: Model,
  keys: Key[],
): Omit<Model, Key> {
  keys.forEach((key) => {
    delete model[key];
  });
  return model;
}

export const destructExpiredDateToken = (value) => {
  const dateRangeMapping = {
    h: 'hours',
    d: 'days',
    w: 'weeks',
    m: 'months',
    y: 'years',
  };
  const numberPart = parseInt(value, 10);
  const letterPart = value.slice(numberPart.toString().length);
  return { number: numberPart, range: dateRangeMapping[letterPart] };
};
