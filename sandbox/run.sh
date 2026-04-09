#!/bin/sh
set -u

LANGUAGE="$1"
TIME_LIMIT="$2"

cd /workspace || exit 1

if [ "$LANGUAGE" = "cpp" ]; then
    g++ -DONLINE_JUDGE main.cpp -O2 -o main
    timeout "${TIME_LIMIT}s" sh -c 'exec ./main'

elif [ "$LANGUAGE" = "java" ]; then
    javac Main.java
    timeout "${TIME_LIMIT}s" sh -c 'exec java -cp . Main'

elif [ "$LANGUAGE" = "python" ]; then
    timeout "${TIME_LIMIT}s" sh -c 'exec python3 main.py'

else
    echo "Unsupported language"
    exit 1
fi
