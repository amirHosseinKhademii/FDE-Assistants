# Motor current control — bare-metal
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= ccarm
CFLAGS  += -Wall -Wextra -Werror -O2 -std=c99
SRCS    := src/foc.c src/field_weakening.c src/temp_derate.c src/lookup_table_1.c src/nvm_block_2.c src/unit_conv_3.c src/timebase_4.c src/rate_limit_5.c src/rate_limit_6.c src/sat_math_7.c src/nvm_block_8.c
OBJS    := $(SRCS:.c=.o)

all: eps-motor-control.a

eps-motor-control.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-motor-control.a

.PHONY: all test clean
