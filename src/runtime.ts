export interface Descriptor {
  configurable?: boolean;
  enumerable?: boolean;
  writable?: boolean;
  get?(): any;
  set?(v: any): void;
  initializer?: () => any;
}
export type LegacyDecorator = (
  target: object,
  prop: string,
  desc: Descriptor
) => Descriptor | null;

const deferred = new WeakMap();

function deferDecorator(proto: object, prop: string, desc: Descriptor): void {
  let map = deferred.get(proto);
  if (!map) {
    map = new Map();
    deferred.set(proto, map);
  }
  map.set(prop, desc);
}

function findDeferredDecorator(
  target: object,
  prop: string
): Descriptor | undefined {
  let cursor: object = (target as any).prototype;
  while (cursor) {
    let desc = deferred.get(cursor)?.get(prop);
    if (desc) {
      return desc;
    }
    cursor = (cursor as any).prototype;
  }
}

export function applyDecorator(
  target: { prototype: object },
  prop: string,
  decorators: LegacyDecorator[],
  initializer?: () => any
): void {
  let desc: Descriptor = {
    configurable: true,
    enumerable: true,
    writable: true,
  };
  if (initializer) {
    desc.initializer = initializer;
  }
  for (let decorator of decorators) {
    desc = decorator(target.prototype, prop, desc) || desc;
  }
  if (desc.initializer === undefined) {
    Object.defineProperty(target.prototype, prop, desc);
  } else {
    deferDecorator(target.prototype, prop, desc);
  }
}

export function initDecorator(target: object, prop: string): void {
  let desc = findDeferredDecorator(target.constructor, prop);
  if (desc) {
    Object.defineProperty(target, prop, {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      writable: desc.writable,
      value: desc.initializer ? desc.initializer.call(target) : undefined,
    });
  }
}
