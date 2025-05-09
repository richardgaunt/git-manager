// Mock implementation for @inquirer/prompts

import { jest } from '@jest/globals';

// Mock answers store
let mockAnswers = {};

// Helper to set mock answers for all tests
export function setMockAnswers(answers) {
  mockAnswers = { ...answers };
}

// Mock implementations for each prompt type
export const select = jest.fn(async (options) => {
  const key = options.message;
  if (mockAnswers[key]) {
    return mockAnswers[key];
  }
  if (options.choices && options.choices.length > 0) {
    return options.choices[0].value;
  }
  return '';
});

export const checkbox = jest.fn(async (options) => {
  const key = options.message;
  if (mockAnswers[key]) {
    return mockAnswers[key];
  }
  return [];
});

export const confirm = jest.fn(async (options) => {
  const key = options.message;
  if (mockAnswers[key] !== undefined) {
    return mockAnswers[key];
  }
  return options.default !== undefined ? options.default : true;
});

export const input = jest.fn(async (options) => {
  const key = options.message;
  if (mockAnswers[key]) {
    return mockAnswers[key];
  }
  return options.default || 'mock-answer';
});

export const search = jest.fn(async (options) => {
  const key = options.message;
  if (mockAnswers[key]) {
    return mockAnswers[key];
  }
  
  // If source function is provided, try to get first item
  if (typeof options.source === 'function') {
    const items = options.source('');
    if (items && items.length > 0) {
      return items[0];
    }
  }
  
  return 'mock-search-result';
});
