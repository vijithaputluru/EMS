import { compareDatesAsc, compareDatesDesc } from "./date";

export const extractCollection = (payload) => {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.data?.data?.$values,
    payload?.data?.$values,
    payload?.$values,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

export const stableSort = (items, compare) =>
  [...items]
    .map((item, index) => ({
      item,
      index,
    }))
    .sort((left, right) => {
      const comparedValue = compare(left.item, right.item);
      return comparedValue === 0 ? left.index - right.index : comparedValue;
    })
    .map(({ item }) => item);

export const sortByDateDesc = (items, selector) =>
  stableSort(items, (left, right) =>
    compareDatesDesc(selector(left), selector(right))
  );

export const sortByDateAsc = (items, selector) =>
  stableSort(items, (left, right) =>
    compareDatesAsc(selector(left), selector(right))
  );

export const sortByNewestIdFirst = (items, selector) =>
  stableSort(items, (left, right) => {
    const leftValue = Number(selector(left) || 0);
    const rightValue = Number(selector(right) || 0);
    return rightValue - leftValue;
  });
