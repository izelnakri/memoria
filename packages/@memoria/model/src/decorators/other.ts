import Schema from "../stores/schema.js";

// NOTE: maybe remove target: references if it bloats memory
export function Generated(generateFunction) {
  return function (target: any, propertyName: string, descriptor: any) {
    Schema.assignColumnMetadata(target.constructor, propertyName, {
      generated: generateFunction || true,
    });

    return target.constructor.Adapter.Decorators.Generated(generateFunction)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

export function Index(nameOrFieldsOrOptions?, maybeFieldsOrOptions?, maybeOptions?) {
  return function (target: any, propertyName: string, descriptor: any) {
    let name = typeof nameOrFieldsOrOptions === "string" ? nameOrFieldsOrOptions : undefined;
    let fields = typeof nameOrFieldsOrOptions === "string" ? maybeFieldsOrOptions : (nameOrFieldsOrOptions as string[]);
    let options =
      typeof nameOrFieldsOrOptions === "object" && !Array.isArray(nameOrFieldsOrOptions)
        ? nameOrFieldsOrOptions
        : maybeOptions;
    if (!options) {
      options =
        typeof maybeFieldsOrOptions === "object" && !Array.isArray(maybeFieldsOrOptions)
          ? maybeFieldsOrOptions
          : maybeOptions;
    }
    let Class = propertyName ? target.constructor : target;

    Schema.getSchema(Class).indices.push({
      target: Class,
      name: name,
      columns: propertyName ? [propertyName] : fields,
      synchronize: options && (options as { synchronize: false }).synchronize === false ? false : true,
      where: options ? options.where : undefined,
      unique: options && options.unique ? true : false,
      spatial: options && options.spatial ? true : false,
      fulltext: options && options.fulltext ? true : false,
      parser: options ? options.parser : undefined,
      sparse: options && options.sparse ? true : false,
      background: options && options.background ? true : false,
      expireAfterSeconds: options ? options.expireAfterSeconds : undefined,
    });

    return target.constructor.Adapter.Decorators.Index(nameOrFieldsOrOptions, maybeFieldsOrOptions, maybeOptions)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

export function Unique(
  nameOrFields?: string | string[] | ((object: any) => any[] | { [key: string]: number }),
  maybeFields?: ((object?: any) => any[] | { [key: string]: number }) | string[]
) {
  return function (target: any, propertyName: string | symbol, descriptor: any) {
    let name = typeof nameOrFields === "string" ? nameOrFields : undefined;
    let fields =
      typeof nameOrFields === "string"
        ? <((object?: any) => any[] | { [key: string]: number }) | string[]>maybeFields
        : (nameOrFields as string[]);
    let columns = fields;

    if (propertyName !== undefined) {
      switch (typeof propertyName) {
        case "string":
          columns = [propertyName];
          break;

        case "symbol":
          columns = [propertyName.toString()];
          break;
      }
    }

    let Class = propertyName ? target.constructor : target;

    Schema.getSchema(Class).uniques.push({
      target: Class,
      name: name,
      columns,
    });

    return target.constructor.Adapter.Decorators.Unique(nameOrFields, maybeFields)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

export function Check(nameOrExpression: string, maybeExpression?: string) {
  return function (target: any, propertyName: string | symbol, descriptor: any) {
    let Class = propertyName ? target.constructor : target;
    let name = maybeExpression ? nameOrExpression : undefined;
    let expression = maybeExpression ? maybeExpression : nameOrExpression;

    Schema.getSchema(Class).checks.push({ target: Class, name, expression });

    return target.constructor.Adapter.Decorators.Check(nameOrExpression, maybeExpression)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

// @Exclusion(`USING gist ("room" WITH =, tsrange("from", "to") WITH &&)`)
export function Exclusion(nameOrExpression: string, maybeExpression?: string) {
  return function (target: any, propertyName: string | symbol, descriptor: any) {
    let Class = propertyName ? target.constructor : target;
    let name = maybeExpression ? nameOrExpression : undefined;
    let expression = maybeExpression ? maybeExpression : nameOrExpression;

    Schema.getSchema(Class).exclusions.push({ target: Class, name, expression });

    return target.constructor.Adapter.Decorators.Exclusion(nameOrExpression, maybeExpression)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

export default {
  Index,
  Unique,
  Check,
  Exclusion,
  Generated,
};

// @Transaction
