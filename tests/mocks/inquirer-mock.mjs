// Mock implementation for inquirer

/**
 * Create a mock for inquirer that returns predefined answers
 * @param {Object} mockAnswers - Map of prompts to answers
 * @returns {Object} - Mock inquirer object
 */
export function createInquirerMock(mockAnswers = {}) {
  return {
    prompt: jest.fn((questions) => {
      // Convert single question to array for consistent handling
      const questionsArray = Array.isArray(questions) ? questions : [questions];
      
      // Build response object based on question names
      const responses = {};
      
      for (const question of questionsArray) {
        const questionName = question.name;
        
        if (mockAnswers[questionName] !== undefined) {
          // Use the provided mock answer
          responses[questionName] = mockAnswers[questionName];
        } else if (question.default !== undefined) {
          // Fall back to default value if provided
          responses[questionName] = question.default;
        } else {
          // Provide some sensible defaults based on question type
          switch (question.type) {
            case 'confirm':
              responses[questionName] = true;
              break;
            case 'list':
            case 'autocomplete':
              responses[questionName] = question.choices 
                ? (Array.isArray(question.choices) ? question.choices[0] : Object.values(question.choices)[0]) 
                : '';
              break;
            case 'checkbox':
              responses[questionName] = [];
              break;
            default:
              responses[questionName] = 'mock-answer';
          }
        }
      }
      
      return Promise.resolve(responses);
    }),
    
    // Add mock for registerPrompt
    registerPrompt: jest.fn()
  };
}

/**
 * Mock for the inquirer-autocomplete-prompt module
 */
export const mockAutocompletePrompt = jest.fn();