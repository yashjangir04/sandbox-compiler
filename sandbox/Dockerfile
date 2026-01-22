# load base operating systme
FROM ubuntu:22.04

# don't ask for permissions
ENV DEBIAN_FRONTEND=noninteractive 

# get the list of all updated/newest available packages and install them (C++, Java, Python)
RUN apt-get update && apt-get install -y \
    g++ \
    openjdk-17-jdk \
    python3 \
    python3-pip \
    time \
    && rm -rf /var/lib/apt/lists/* #fsaf

# executor lives here (DO NOT MOUNT THIS)
WORKDIR /executor

# copy the run.sh script to the executor
COPY run.sh /executor/run.sh

# make the run.sh executable
RUN chmod +x /executor/run.sh

# user code will be mounted here
WORKDIR /workspace

ENTRYPOINT ["/executor/run.sh"]

# All containers share the same image (Ubuntu + compilers + run.sh).
# Each container gets its own small writable layer and its own files, memory, and processes.
