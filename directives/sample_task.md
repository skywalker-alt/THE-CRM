# Sample Task Directive

This directive explains how to run a sample task.

## Goal
Demonstrate the 3-layer architecture by processing a message from a temporary file.

## Inputs
- `input_file`: Path to a text file in `.tmp/`

## Tools to use
- `execution/sample_task.py`

## Logic
1. Create a message in a file inside `.tmp/`.
2. Run `python execution/sample_task.py .tmp/your_file.txt`.
3. Verify the output.

## Edge Cases
- If the file doesn't exist, the script will return an error message.
