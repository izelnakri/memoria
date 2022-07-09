import typeOf, { LIST_TYPES, OBJECT_TYPES } from './type-of.js';
import type { JSObject } from './object.js';

// TODO: extend this to make properties[property] = Number | String etc(?)
// export default function match(item: any[], prop: any[]): boolean {
// }
export default function match(item: JSObject, properties: JSObject): boolean {
  if (Array.isArray(properties)) {
    if (!Array.isArray(item)) {
      return false;
    }

    return !Array.isArray(item)
      ? false
      : properties.every((element, index) => {
        if (index >= item.length) {
          return false;
        }
        let targetPropertyType = typeOf(element);
        if (LIST_TYPES.has(targetPropertyType)) {
          return LIST_TYPES.has(typeOf(item[index])) ? match(item[index], element) : false;
        } else if (OBJECT_TYPES.has(targetPropertyType)) {
          return OBJECT_TYPES.has(typeOf(item[index])) ? match(item[index], element) : false;
        } else if (targetPropertyType === 'date') {
          return typeOf(item[index]) === 'date' ? element.getTime() === item[index].getTime() : false;
        } else if (targetPropertyType === 'regexp') {
          if (typeOf(item[index]) === 'regexp') {
            return String(item[index]) === String(element);
          } else if (typeOf(item[index]) === 'string') {
            return element.test(item[index]);
          }

          return false;
        }

        return element === item[index];
      });
  } else if (!OBJECT_TYPES.has(typeOf(properties)) || !OBJECT_TYPES.has(typeOf(item))) {
    return false;
  }

  return Object.getOwnPropertyDescriptors(properties)
    .every((propertyDescriptor) => {
      if (!propertyDescriptor.enumerable) {
        return true;
      }

      let propertyName = propertyDescriptor.key;
      let targetValue = properties[propertyName]
      let targetPropertyType = typeOf(targetValue);
      if (LIST_TYPES.has(targetPropertyType)) {
        return LIST_TYPES.has(typeOf(item[propertyName])) ? match(item[propertyName], targetValue) : false;
      } else if (OBJECT_TYPES.has(targetPropertyType)) {
        return OBJECT_TYPES.has(typeOf(item[propertyName])) ? match(item[propertyName], targetValue) : false;
      } else if (targetPropertyType === 'date') {
        return typeOf(item[propertyName]) === 'date' ? targetValue.getTime() === item[propertyName].getTime() : false;
      } else if (targetPropertyType === 'regexp') {
        if (typeOf(item[propertyName]) === 'regexp') {
          return String(item[propertyName]) === String(targetValue);
        } else if (typeOf(item[propertyName]) === 'string') {
          return targetValue.test(item[propertyName]);
        }

        return false;
      }

      return item[propertyName] === targetValue;
    });
}
