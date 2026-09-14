# EPS core control — classic-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= ccarm
CFLAGS  += -Wall -Wextra -Werror -O2 -std=c99
SRCS    := src/assist.c src/arbitration.c src/torque_sense.c src/veh_speed.c src/state_machine_1.c src/filter_iir_2.c src/timebase_3.c src/fixpt_4.c src/bitfield_5.c
OBJS    := $(SRCS:.c=.o)

all: eps-core.a

eps-core.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-core.a

.PHONY: all test clean
