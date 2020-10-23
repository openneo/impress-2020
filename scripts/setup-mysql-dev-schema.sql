-- MySQL dump 10.13  Distrib 8.0.21, for osx10.15 (x86_64)
--
-- Host: impress.openneo.net    Database: openneo_impress
-- ------------------------------------------------------
-- Server version	5.5.62-0ubuntu0.14.04.1-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `closet_hangers`
--

DROP TABLE IF EXISTS `closet_hangers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `closet_hangers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `owned` tinyint(1) NOT NULL DEFAULT '1',
  `list_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `index_closet_hangers_on_list_id` (`list_id`),
  KEY `index_closet_hangers_on_user_id` (`user_id`),
  KEY `index_closet_hangers_on_item_id_and_owned` (`item_id`,`owned`),
  KEY `index_closet_hangers_test_20131226` (`user_id`,`list_id`,`item_id`,`owned`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `closet_lists`
--

DROP TABLE IF EXISTS `closet_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `closet_lists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `user_id` int(11) DEFAULT NULL,
  `hangers_owned` tinyint(1) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `visibility` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `index_closet_lists_on_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zones_restrict` text COLLATE utf8_unicode_ci NOT NULL,
  `thumbnail_url` mediumtext COLLATE utf8_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `rarity_index` smallint(6) DEFAULT NULL,
  `price` mediumint(9) NOT NULL,
  `weight_lbs` smallint(6) DEFAULT NULL,
  `species_support_ids` mediumtext COLLATE utf8_unicode_ci,
  `sold_in_mall` tinyint(1) NOT NULL DEFAULT '0',
  `last_spidered` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `explicitly_body_specific` tinyint(1) NOT NULL DEFAULT '0',
  `manual_special_color_id` int(11) DEFAULT NULL,
  `modeling_status_hint` enum('done','glitchy') COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `objects_last_spidered` (`last_spidered`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `item_translations`
--

DROP TABLE IF EXISTS `item_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_translations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_id` int(11) DEFAULT NULL,
  `locale` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `rarity` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `index_item_translations_on_item_id` (`item_id`),
  KEY `index_item_translations_on_locale` (`locale`),
  KEY `index_item_translations_name` (`name`),
  KEY `index_item_translations_on_item_id_and_locale` (`item_id`,`locale`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `modeling_logs`
--

DROP TABLE IF EXISTS `modeling_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modeling_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `log_json` text NOT NULL,
  `pet_name` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parents_swf_assets`
--

DROP TABLE IF EXISTS `parents_swf_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parents_swf_assets` (
  `parent_id` mediumint(9) NOT NULL,
  `swf_asset_id` mediumint(9) NOT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_type` varchar(8) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_parents_swf_assets` (`parent_id`,`swf_asset_id`),
  KEY `parents_swf_assets_swf_asset_id` (`swf_asset_id`),
  KEY `index_parents_swf_assets_on_parent_id_and_parent_type` (`parent_id`,`parent_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pet_types`
--

DROP TABLE IF EXISTS `pet_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pet_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `color_id` tinyint(4) NOT NULL,
  `species_id` tinyint(4) NOT NULL,
  `created_at` datetime NOT NULL,
  `body_id` smallint(6) NOT NULL,
  `image_hash` varchar(8) COLLATE utf8_unicode_ci DEFAULT NULL,
  `basic_image_hash` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pet_types_species_color` (`species_id`,`color_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pet_states`
--

DROP TABLE IF EXISTS `pet_states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pet_states` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_type_id` mediumint(9) NOT NULL,
  `swf_asset_ids` text COLLATE utf8_unicode_ci NOT NULL,
  `female` tinyint(1) DEFAULT NULL,
  `mood_id` int(11) DEFAULT NULL,
  `unconverted` tinyint(1) DEFAULT NULL,
  `labeled` tinyint(1) NOT NULL DEFAULT '0',
  `glitched` tinyint(1) NOT NULL DEFAULT '0',
  `artist_neopets_username` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pet_states_pet_type_id` (`pet_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `swf_assets`
--

DROP TABLE IF EXISTS `swf_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `swf_assets` (
  `type` varchar(7) COLLATE utf8_unicode_ci NOT NULL,
  `remote_id` mediumint(9) NOT NULL,
  `url` mediumtext COLLATE utf8_unicode_ci NOT NULL,
  `zone_id` tinyint(4) NOT NULL,
  `zones_restrict` text COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `body_id` smallint(6) NOT NULL,
  `has_image` tinyint(1) NOT NULL DEFAULT '0',
  `image_requested` tinyint(1) NOT NULL DEFAULT '0',
  `reported_broken_at` datetime DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `image_manual` tinyint(1) NOT NULL DEFAULT '0',
  `manifest` text COLLATE utf8_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `swf_assets_body_id_and_object_id` (`body_id`),
  KEY `idx_swf_assets_zone_id` (`zone_id`),
  KEY `swf_assets_type_and_id` (`type`,`remote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `auth_server_id` tinyint(4) NOT NULL,
  `remote_id` int(11) NOT NULL,
  `points` int(11) NOT NULL DEFAULT '0',
  `beta` tinyint(1) NOT NULL DEFAULT '0',
  `remember_token` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `remember_created_at` datetime DEFAULT NULL,
  `image_mode_tester` tinyint(1) NOT NULL DEFAULT '0',
  `owned_closet_hangers_visibility` int(11) NOT NULL DEFAULT '1',
  `wanted_closet_hangers_visibility` int(11) NOT NULL DEFAULT '1',
  `contact_neopets_connection_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-10-22 20:30:56
