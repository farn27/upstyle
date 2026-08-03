package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import androidx.compose.animation.animateContentSize

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrmPipelineScreen(viewModel: AppViewModel) {
    val deals by viewModel.crmDeals.collectAsStateWithLifecycle()
    val stages = listOf("PROSPECT", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST")
    var selectedDeal by remember { mutableStateOf<com.upstyle.bizgrow.data.CrmDeal?>(null) }
    var showStageSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pipeline CRM") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        LazyRow(
            modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(stages) { stage ->
                val stageDeals = deals.filter { it.stage == stage }
                val totalValue = stageDeals.sumOf { it.dealValue }
                
                Column(modifier = Modifier.width(280.dp).animateContentSize()) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(stage, fontWeight = FontWeight.Bold)
                            Text("${stageDeals.size} Deals | Rp ${"%,.0f".format(totalValue)}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    
                    LazyColumn(modifier = Modifier.fillMaxHeight().animateContentSize()) {
                        items(stageDeals) { deal ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp)
                                    .animateContentSize()
                                    .clickable { 
                                        selectedDeal = deal
                                        showStageSheet = true 
                                    },
                                shape = RoundedCornerShape(20.dp)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(deal.contactName, fontWeight = FontWeight.Bold)
                                    Text(deal.companyName)
                                    Text("Rp ${"%,.0f".format(deal.dealValue)}", color = Color(0xFF2E7D32))
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if (showStageSheet && selectedDeal != null) {
            ModalBottomSheet(onDismissRequest = { showStageSheet = false }) {
                Column(Modifier.padding(16.dp)) {
                    Text("Update Stage", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    stages.forEach { stage ->
                        TextButton(
                            onClick = {
                                selectedDeal?.id?.let { id -> viewModel.updateDealStage(id, stage) }
                                showStageSheet = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(stage)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}
