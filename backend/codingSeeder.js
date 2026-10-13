const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initializeDatabase } = require('./config/database');
const CodingQuestion = require('./models/CodingQuestion');

const questions = [

  {
    title: "Reverse a String",
    description: "Given a string `s`, write a function that reverses the string in-place or returns the reversed version.",
    difficulty: "Easy",
    category: "DSA",
    role: "Software Engineer",
    tags: ["dsa", "frontend", "fullstack"],
    topics: ["String", "Two Pointers"],
    acceptanceRate: "84.2%",
    submissionsCount: 18450,
    inputFormat: "A single string s.",
    outputFormat: "The reversed string.",
    constraints: "1 <= s.length <= 10^5\n`s` consists of printable ASCII characters.",
    followUp: "Can you solve it in O(n) time and O(1) extra space by modifying the input string in-place?",
    hints: [
      "Think about comparing and swapping characters from both ends of the string.",
      "Use a two-pointer technique: one starting at 0, one at length - 1.",
      "Swap characters at the left and right pointers, then move pointers inward."
    ],
    similarQuestions: [
      { title: "Reverse Vowels of a String", difficulty: "Easy" },
      { title: "Valid Palindrome", difficulty: "Easy" }
    ],
    sampleInput: "hello",
    sampleOutput: "olleh",
    testCases: [
      {
        input: "hello",
        output: "olleh",
        expectedOutput: "olleh",
        explanation: "Reversing the characters of \"hello\" from right to left produces \"olleh\"."
      },
      {
        input: "OpenAI",
        output: "IAnepO",
        expectedOutput: "IAnepO",
        explanation: "The characters are reversed while preserving case sensitivity, resulting in \"IAnepO\"."
      },
      {
        input: "PrepAI",
        output: "IAperP",
        expectedOutput: "IAperP",
        explanation: "The string is reversed character-by-character from the last index to the first."
      }
    ],
    hiddenTestCases: [
      { input: "world", output: "dlrow" },
      { input: "a", output: "a" },
      { input: "12345", output: "54321" },
      { input: "RaceCar", output: "raCecaR" },
      { input: "Competitive Programming", output: "gnimmargorP evititepmoC" }
    ]
  },
  {
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
    difficulty: "Easy",
    category: "DSA",
    role: "Software Engineer",
    tags: ["dsa", "fullstack", "backend"],
    topics: ["Array", "Hash Table"],
    acceptanceRate: "52.8%",
    submissionsCount: 24100,
    inputFormat: "First line: N (number of elements).\nSecond line: N space-separated integers.\nThird line: target integer.",
    outputFormat: "Two space-separated 0-indexed integers representing indices.",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
    followUp: "Can you come up with an algorithm that is less than O(n^2) time complexity?",
    hints: [
      "A brute force search checks every pair, taking O(n^2) time.",
      "Can we use a Hash Table to store values we have seen so far?",
      "For each element x, check if (target - x) exists in the Hash Table in O(1) time."
    ],
    similarQuestions: [
      { title: "3Sum", difficulty: "Medium" },
      { title: "Two Sum II - Input Array Is Sorted", difficulty: "Medium" }
    ],
    sampleInput: "4\n2 7 11 15\n9",
    sampleOutput: "0 1",
    testCases: [
      {
        input: "4\n2 7 11 15\n9",
        output: "0 1",
        expectedOutput: "0 1",
        explanation: "Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1]."
      },
      {
        input: "3\n3 2 4\n6",
        output: "1 2",
        expectedOutput: "1 2",
        explanation: "Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2]."
      },
      {
        input: "2\n3 3\n6",
        output: "0 1",
        expectedOutput: "0 1",
        explanation: "Because nums[0] + nums[1] == 3 + 3 == 6, we return [0, 1]."
      }
    ],
    hiddenTestCases: [
      { input: "4\n1 5 3 7\n8", output: "1 2" },
      { input: "3\n10 20 30\n50", output: "1 2" },
      { input: "5\n-1 -2 -3 -4 -5\n-8", output: "2 4" }
    ]
  },
  {
    title: "Palindrome Check",
    description: "Given a string `s`, determine if it is a palindrome considering only alphanumeric characters and ignoring case.",
    difficulty: "Easy",
    category: "DSA",
    role: "Frontend Developer",
    tags: ["dsa", "frontend"],
    topics: ["String", "Two Pointers"],
    acceptanceRate: "79.1%",
    submissionsCount: 14200,
    inputFormat: "A single string s.",
    outputFormat: "true or false",
    constraints: "1 <= s.length <= 2 * 10^5",
    followUp: "Can you implement this with O(1) auxiliary space without creating a full copy of the cleaned string?",
    hints: [
      "Use two pointers: one at the start, one at the end.",
      "Skip non-alphanumeric characters while moving pointers inward.",
      "Compare characters in a case-insensitive manner."
    ],
    similarQuestions: [
      { title: "Valid Palindrome II", difficulty: "Easy" }
    ],
    sampleInput: "racecar",
    sampleOutput: "true",
    testCases: [
      {
        input: "racecar",
        output: "true",
        expectedOutput: "true",
        explanation: "\"racecar\" reads the same forwards and backwards."
      },
      {
        input: "A man a plan a canal Panama",
        output: "true",
        expectedOutput: "true",
        explanation: "Ignoring spaces and capitalization, \"amanaplanacanalpanama\" is a palindrome."
      },
      {
        input: "hello",
        output: "false",
        expectedOutput: "false",
        explanation: "\"hello\" reads \"olleh\" backwards, so it is not a palindrome."
      }
    ],
    hiddenTestCases: [
      { input: "madam", output: "true" },
      { input: "12321", output: "true" },
      { input: "coding", output: "false" }
    ]
  },
  {
    title: "Find Maximum Element",
    description: "Given an array of integers, find and return the maximum element.",
    difficulty: "Easy",
    category: "DSA",
    role: "Software Engineer",
    tags: ["dsa", "frontend", "backend"],
    topics: ["Array"],
    acceptanceRate: "91.4%",
    submissionsCount: 16800,
    inputFormat: "First line: N. Second line: N space-separated integers.",
    outputFormat: "The maximum integer value.",
    constraints: "1 <= N <= 10^5\n-10^9 <= nums[i] <= 10^9",
    hints: [
      "Initialize max with the first element.",
      "Iterate through the array and update max whenever a larger element is found."
    ],
    sampleInput: "5\n3 1 4 1 5",
    sampleOutput: "5",
    testCases: [
      {
        input: "5\n3 1 4 1 5",
        output: "5",
        expectedOutput: "5",
        explanation: "The largest integer in [3, 1, 4, 1, 5] is 5."
      },
      {
        input: "4\n-10 -5 -20 -1",
        output: "-1",
        expectedOutput: "-1",
        explanation: "In an array of negative numbers [-10, -5, -20, -1], -1 is the maximum value."
      },
      {
        input: "1\n42",
        output: "42",
        expectedOutput: "42",
        explanation: "Single element array returns 42."
      }
    ],
    hiddenTestCases: [
      { input: "3\n100 200 150", output: "200" },
      { input: "5\n0 0 0 0 0", output: "0" }
    ]
  },
  {
    title: "FizzBuzz",
    description: "Print numbers from 1 to N. For multiples of 3 print 'Fizz', for multiples of 5 print 'Buzz', for multiples of both print 'FizzBuzz'.",
    difficulty: "Easy",
    category: "DSA",
    role: "Software Engineer",
    tags: ["dsa", "frontend", "fullstack"],
    topics: ["Math", "String"],
    acceptanceRate: "88.6%",
    submissionsCount: 31000,
    inputFormat: "A single integer N.",
    outputFormat: "N lines of output.",
    constraints: "1 <= N <= 100",
    hints: [
      "Check condition for multiples of 15 (both 3 and 5) first.",
      "Then check multiples of 3, then multiples of 5."
    ],
    sampleInput: "5",
    sampleOutput: "1\n2\nFizz\n4\nBuzz",
    testCases: [
      {
        input: "5",
        output: "1\n2\nFizz\n4\nBuzz",
        expectedOutput: "1\n2\nFizz\n4\nBuzz",
        explanation: "3 is replaced by 'Fizz' and 5 is replaced by 'Buzz'."
      },
      {
        input: "3",
        output: "1\n2\nFizz",
        expectedOutput: "1\n2\nFizz",
        explanation: "Prints 1, 2, and 'Fizz' for 3."
      },
      {
        input: "15",
        output: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
        expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
        explanation: "15 is a multiple of both 3 and 5, so it outputs 'FizzBuzz'."
      }
    ],
    hiddenTestCases: [
      { input: "10", output: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz" }
    ]
  },

  {
    title: "Valid Parentheses",
    description: "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    difficulty: "Medium",
    category: "DSA",
    role: "Backend Developer",
    tags: ["dsa", "fullstack", "backend"],
    topics: ["Stack", "String"],
    acceptanceRate: "68.4%",
    submissionsCount: 19800,
    inputFormat: "A single string s.",
    outputFormat: "true or false",
    constraints: "1 <= s.length <= 10^4",
    followUp: "Can you implement this using a Stack data structure with O(n) time and O(n) space?",
    hints: [
      "Use a Stack data structure.",
      "Push opening brackets onto the stack.",
      "When encountering a closing bracket, check if it matches the top of the stack."
    ],
    similarQuestions: [
      { title: "Generate Parentheses", difficulty: "Medium" }
    ],
    sampleInput: "()[]{}",
    sampleOutput: "true",
    testCases: [
      {
        input: "()[]{}",
        output: "true",
        expectedOutput: "true",
        explanation: "All open brackets are closed by the corresponding same type of brackets in correct order."
      },
      {
        input: "(]",
        output: "false",
        expectedOutput: "false",
        explanation: "Closing bracket ']' does not match the open bracket '('."
      },
      {
        input: "([{}])",
        output: "true",
        expectedOutput: "true",
        explanation: "Nested brackets are closed in proper LIFO order."
      }
    ],
    hiddenTestCases: [
      { input: "([)]", output: "false" },
      { input: "{[]}", output: "true" }
    ]
  },
  {
    title: "Longest Common Prefix",
    description: "Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return empty string.",
    difficulty: "Medium",
    category: "DSA",
    role: "Frontend Developer",
    tags: ["dsa", "frontend"],
    topics: ["String", "Trie"],
    acceptanceRate: "61.2%",
    submissionsCount: 12500,
    inputFormat: "First line: N (number of strings). Next N lines: one string each.",
    outputFormat: "The longest common prefix string or 'NONE'.",
    constraints: "1 <= N <= 200\n0 <= strings[i].length <= 200",
    hints: [
      "Sort the array of strings.",
      "Compare only the first and last string after sorting."
    ],
    sampleInput: "3\nflower\nflow\nflight",
    sampleOutput: "fl",
    testCases: [
      {
        input: "3\nflower\nflow\nflight",
        output: "fl",
        expectedOutput: "fl",
        explanation: "The prefix \"fl\" is common to all 3 strings."
      },
      {
        input: "3\ndog\nracecar\ncar",
        output: "NONE",
        expectedOutput: "NONE",
        explanation: "There is no common prefix among the input strings."
      },
      {
        input: "2\ninterspecies\ninterstellar",
        output: "inters",
        expectedOutput: "inters",
        explanation: "The common prefix between both words is \"inters\"."
      }
    ],
    hiddenTestCases: [
      { input: "3\na\na\na", output: "a" }
    ]
  },
  {
    title: "Count Character Frequency",
    description: "Given a string, count the frequency of each character and print them in alphabetical order.",
    difficulty: "Medium",
    category: "DSA",
    role: "Backend Developer",
    tags: ["dsa", "backend", "fullstack"],
    topics: ["Hash Table", "String"],
    acceptanceRate: "73.5%",
    submissionsCount: 11000,
    inputFormat: "A single lowercase string.",
    outputFormat: "Each line: character space frequency, sorted alphabetically.",
    constraints: "1 <= s.length <= 10^5",
    hints: [
      "Use a map or frequency array of size 26.",
      "Iterate through the string and count frequencies."
    ],
    sampleInput: "apple",
    sampleOutput: "a 1\ne 1\nl 1\np 2",
    testCases: [
      {
        input: "apple",
        output: "a 1\ne 1\nl 1\np 2",
        expectedOutput: "a 1\ne 1\nl 1\np 2",
        explanation: "Counts 'a': 1, 'e': 1, 'l': 1, 'p': 2 in alphabetical order."
      },
      {
        input: "banana",
        output: "a 3\nb 1\nn 2",
        expectedOutput: "a 3\nb 1\nn 2",
        explanation: "'a' appears 3 times, 'b' 1 time, and 'n' 2 times."
      },
      {
        input: "code",
        output: "c 1\nd 1\ne 1\no 1",
        expectedOutput: "c 1\nd 1\ne 1\no 1",
        explanation: "Each character appears exactly once."
      }
    ],
    hiddenTestCases: [
      { input: "aab", output: "a 2\nb 1" }
    ]
  },

  {
    title: "Median of Two Sorted Arrays",
    description: "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.",
    difficulty: "Hard",
    category: "DSA",
    role: "Software Engineer",
    tags: ["dsa", "backend"],
    topics: ["Array", "Binary Search", "Divide and Conquer"],
    acceptanceRate: "39.5%",
    submissionsCount: 42000,
    inputFormat: "First line: m. Second line: m integers.\nThird line: n. Fourth line: n integers.",
    outputFormat: "A single float value formatted to 1 decimal place.",
    constraints: "0 <= m, n <= 1000\n1 <= m + n <= 2000",
    followUp: "Overall run time complexity should be O(log(m+n)).",
    hints: [
      "Use Binary Search on the smaller array.",
      "Partition both arrays such that left half elements <= right half elements."
    ],
    similarQuestions: [
      { title: "K-th Element of Two Sorted Arrays", difficulty: "Medium" }
    ],
    sampleInput: "2\n1 3\n1\n2",
    sampleOutput: "2.0",
    testCases: [
      {
        input: "2\n1 3\n1\n2",
        output: "2.0",
        expectedOutput: "2.0",
        explanation: "Merged array = [1, 2, 3] and median is 2.0."
      },
      {
        input: "2\n1 2\n2\n3 4",
        output: "2.5",
        expectedOutput: "2.5",
        explanation: "Merged array = [1, 2, 3, 4] and median is (2 + 3) / 2 = 2.5."
      },
      {
        input: "2\n0 0\n2\n0 0",
        output: "0.0",
        expectedOutput: "0.0",
        explanation: "Merged array = [0, 0, 0, 0] and median is 0.0."
      }
    ],
    hiddenTestCases: [
      { input: "1\n1\n3\n2 3 4", output: "2.5" }
    ]
  },
  {
    title: "Trapping Rain Water",
    description: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    difficulty: "Hard",
    category: "DSA",
    role: "Software Engineer",
    tags: ["dsa", "fullstack"],
    topics: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
    acceptanceRate: "61.0%",
    submissionsCount: 29000,
    inputFormat: "First line: N. Second line: N non-negative integers.",
    outputFormat: "Total units of trapped water.",
    constraints: "1 <= N <= 2 * 10^4\n0 <= height[i] <= 10^5",
    followUp: "Can you solve it in O(n) time and O(1) space using two pointers?",
    hints: [
      "Water trapped at index i is min(max_left, max_right) - height[i].",
      "Maintain left_max and right_max pointers."
    ],
    sampleInput: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
    sampleOutput: "6",
    testCases: [
      {
        input: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
        output: "6",
        expectedOutput: "6",
        explanation: "The elevation map traps 6 total units of rain water."
      },
      {
        input: "6\n4 2 0 3 2 5",
        output: "9",
        expectedOutput: "9",
        explanation: "The elevation map traps 9 total units of rain water."
      },
      {
        input: "3\n3 0 3",
        output: "3",
        expectedOutput: "3",
        explanation: "Between heights 3 and 3, 3 units of water are trapped in middle pool of height 0."
      }
    ],
    hiddenTestCases: [
      { input: "5\n1 1 1 1 1", output: "0" }
    ]
  }
];

initializeDatabase()
  .then(async () => {
    console.log('Initializing MySQL for Coding Question Seeding...');
    await CodingQuestion.deleteMany({});
    await CodingQuestion.insertMany(questions);
    console.log(`✓ Successfully seeded ${questions.length} rich coding questions into MySQL!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
