# End-of-line calibration — classic-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= arm-none-eabi-gcc
CFLAGS  += -Wall -Wextra -Werror -O2 -std=c99
SRCS    := src/eol_learn.c src/eol_seq.c src/rate_limit_1.c src/can_shim_2.c src/rate_limit_3.c src/unit_conv_4.c
OBJS    := $(SRCS:.c=.o)

all: eps-end-of-line.a

eps-end-of-line.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-end-of-line.a

.PHONY: all test clean
