package com.upstyle.bizgrow.ui

import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

actual fun todayDate(): String =
    LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE) // "YYYY-MM-DD"

actual fun currentTime(): String =
    LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")) // "HH:MM"
