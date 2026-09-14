# Calibration tooling — adaptive-autosar
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= ccarm
CFLAGS  += -Wall -Wextra -Werror -Os -std=c99
SRCS    := src/a2l_export.c src/dataset.c src/filter_iir_1.c src/ring_buffer_2.c src/timebase_3.c src/rate_limit_4.c src/ring_buffer_5.c src/fixpt_6.c src/lookup_table_7.c
OBJS    := $(SRCS:.c=.o)

all: eps-calibration-tools.a

eps-calibration-tools.a: $(OBJS)
	$(AR) rcs $@ $^

test:
	$(MAKE) -C test run

clean:
	rm -f $(OBJS) eps-calibration-tools.a

.PHONY: all test clean
