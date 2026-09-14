# Safety monitor — classic-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= tricore-gcc
CFLAGS  += -Wall -Wextra -Werror -Os -std=c99
SRCS    := src/torque_bound.c src/watchdog.c src/plausibility.c src/bitfield_1.c src/rate_limit_2.c src/event_queue_3.c src/debounce_4.c src/rate_limit_5.c src/timebase_6.c
OBJS    := $(SRCS:.c=.o)

all: eps-safety-monitor.a

eps-safety-monitor.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-safety-monitor.a

.PHONY: all test clean
