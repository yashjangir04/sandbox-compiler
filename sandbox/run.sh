#!/bin/bash
set -e

LANGUAGE=$1
TIME_LIMIT=$2

# Move to user code directory
cd /workspace

if [ "$LANGUAGE" = "cpp" ]; then
    g++ -DONLINE_JUDGE main.cpp -O2 -o main
    timeout ${TIME_LIMIT}s ./main

elif [ "$LANGUAGE" = "java" ]; then
    javac Main.java
    timeout ${TIME_LIMIT}s java Main

elif [ "$LANGUAGE" = "python" ]; then
    timeout ${TIME_LIMIT}s python3 main.py

else
    echo "Unsupported language"
    exit 1
fi
