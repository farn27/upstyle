package com.upstyle.bizgrow.ui.state

data class UiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)
