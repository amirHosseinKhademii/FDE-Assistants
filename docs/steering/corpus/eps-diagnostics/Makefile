# Diagnostics — classic-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= tricore-gcc
CFLAGS  += -Wall -Wextra -Werror -Os -std=c99
SRCS    := src/dtc.c src/uds.c src/snapshot.c src/lookup_table_1.c src/bitfield_2.c src/crc_3.c src/fixpt_4.c src/checksum_5.c src/state_machine_6.c src/timebase_7.c src/checksum_8.c
OBJS    := $(SRCS:.c=.o)

all: eps-diagnostics.a

eps-diagnostics.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-diagnostics.a

.PHONY: all test clean
