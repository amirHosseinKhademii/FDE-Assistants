# Steering feel — classic-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= arm-none-eabi-gcc
CFLAGS  += -Wall -Wextra -Werror -O2 -std=c99
SRCS    := src/damping.c src/hysteresis_comp.c src/friction_comp.c src/rtc.c src/state_machine_1.c src/rate_limit_2.c src/can_shim_3.c src/ring_buffer_4.c src/bitfield_5.c src/debounce_6.c src/event_queue_7.c src/checksum_8.c
OBJS    := $(SRCS:.c=.o)

all: eps-steering-feel.a

eps-steering-feel.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-steering-feel.a

.PHONY: all test clean
