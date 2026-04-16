import sys
import os

def main():
    """
    Sample execution script that reads a message from a file and prints it.
    This demonstrates the deterministic 'Execution' layer.
    """
    if len(sys.argv) < 2:
        print("Usage: python sample_task.py <input_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Error: File {input_file} not found.")
        sys.exit(1)

    with open(input_file, 'r') as f:
        content = f.read()

    print(f"Executing task with content: {content}")
    print("Task completed successfully.")

if __name__ == "__main__":
    main()
