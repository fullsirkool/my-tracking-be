export function exclude<Model, Key extends keyof Model>(
  model: Model,
  keys: Key[]
): Omit<Model, Key> {
  keys.forEach(key => {
    delete model[key];
  });
  return model;
}
