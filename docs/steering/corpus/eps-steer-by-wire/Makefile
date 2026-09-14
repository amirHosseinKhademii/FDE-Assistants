# Steer-by-wire (pre-development) — adaptive-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= arm-none-eabi-gcc
CFLAGS  += -Wall -Wextra -Werror -O2 -std=c99
SRCS    := src/road_wheel_actuator.c src/feedback_actuator.c src/filter_iir_1.c src/rate_limit_2.c src/crc_3.c src/debounce_4.c
OBJS    := $(SRCS:.c=.o)

all: eps-steer-by-wire.a

eps-steer-by-wire.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-steer-by-wire.a

.PHONY: all test clean
